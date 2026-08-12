"use server";

import "server-only";

import { del } from "@vercel/blob";
import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  iterationImages,
  projectIterations,
  projects,
} from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import { getServerEnv } from "@/lib/env";
import { assertOnboardedUser } from "@/lib/session";
import { iterationInputSchema } from "@/lib/validations";
import type { ActionState } from "@/types/actions";

const idSchema = z.uuid();

export async function createIterationAction(
  projectId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await assertOnboardedUser();
  const parsedId = idSchema.safeParse(projectId);
  if (!parsedId.success) return { status: "error", message: "Invalid project." };
  const parsed = iterationInputSchema.safeParse({
    versionLabel: formData.get("versionLabel"),
    description: formData.get("description"),
  });
  if (!parsed.success) return validationError(parsed.error);

  let iterationId: string;
  try {
    const [project] = await db
      .select({ id: projects.id, status: projects.status })
      .from(projects)
      .where(
        and(
          eq(projects.id, parsedId.data),
          eq(projects.ownerId, current.user.id),
        ),
      )
      .limit(1);
    if (!project) throw new Error("Not found");
    if (project.status !== "approved") {
      throw new Error("Iterations can only be added to approved projects.");
    }

    const [iteration] = await db
      .insert(projectIterations)
      .values({
        projectId: project.id,
        ownerId: current.user.id,
        versionLabel: parsed.data.versionLabel || null,
        description: parsed.data.description,
      })
      .returning({ id: projectIterations.id });
    if (!iteration) throw new Error("Unable to create iteration.");
    iterationId = iteration.id;
  } catch (error) {
    return safeActionError(error, "Unable to create the iteration.");
  }

  redirect(
    `/dashboard/projects/${parsedId.data}/iterations/${iterationId}/edit`,
  );
}

export async function updateIterationAction(
  iterationId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await assertOnboardedUser();
  const parsedId = idSchema.safeParse(iterationId);
  if (!parsedId.success) return { status: "error", message: "Invalid iteration." };
  const parsed = iterationInputSchema.safeParse({
    versionLabel: formData.get("versionLabel"),
    description: formData.get("description"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const [existing] = await db
      .select({
        status: projectIterations.status,
        projectId: projectIterations.projectId,
        projectSlug: projects.slug,
      })
      .from(projectIterations)
      .innerJoin(projects, eq(projectIterations.projectId, projects.id))
      .where(
        and(
          eq(projectIterations.id, parsedId.data),
          eq(projectIterations.ownerId, current.user.id),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("Not found");

    const nextStatus =
      existing.status === "approved"
        ? "pending"
        : existing.status === "rejected"
          ? "draft"
          : existing.status;
    await db
      .update(projectIterations)
      .set({
        versionLabel: parsed.data.versionLabel || null,
        description: parsed.data.description,
        status: nextStatus,
        rejectionReason: null,
        submittedAt: nextStatus === "pending" ? new Date() : null,
        approvedAt: nextStatus === "pending" ? null : undefined,
        approvedBy: nextStatus === "pending" ? null : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectIterations.id, parsedId.data),
          eq(projectIterations.ownerId, current.user.id),
        ),
      );

    revalidatePath(
      `/dashboard/projects/${existing.projectId}/iterations/${parsedId.data}/edit`,
    );
    revalidatePath(`/p/${existing.projectSlug}`);
    return {
      status: "success",
      message:
        existing.status === "approved"
          ? "Changes saved and submitted for review."
          : "Iteration saved.",
    };
  } catch (error) {
    return safeActionError(error, "Unable to save the iteration.");
  }
}

export async function submitIterationAction(iterationId: string) {
  const current = await assertOnboardedUser();
  const id = idSchema.parse(iterationId);
  const [iteration] = await db
    .select({
      id: projectIterations.id,
      projectId: projectIterations.projectId,
      status: projectIterations.status,
      projectStatus: projects.status,
    })
    .from(projectIterations)
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .where(
      and(
        eq(projectIterations.id, id),
        eq(projectIterations.ownerId, current.user.id),
      ),
    )
    .limit(1);
  if (!iteration) throw new Error("Not found");
  if (iteration.projectStatus !== "approved") {
    throw new Error("The project must be approved before submitting an iteration.");
  }
  if (!["draft", "rejected"].includes(iteration.status)) {
    throw new Error("Only draft or rejected iterations can be submitted.");
  }

  const [images] = await db
    .select({ value: count() })
    .from(iterationImages)
    .where(eq(iterationImages.iterationId, id));
  if (!images || images.value < 1 || images.value > 3) {
    throw new Error("Iteration must have between 1 and 3 images.");
  }

  await db
    .update(projectIterations)
    .set({
      status: "pending",
      rejectionReason: null,
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectIterations.id, id),
        eq(projectIterations.ownerId, current.user.id),
      ),
    );

  revalidatePath(`/dashboard/projects/${iteration.projectId}/edit`);
  redirect(`/dashboard/projects/${iteration.projectId}/edit?submitted=iteration`);
}

export async function deleteIterationAction(iterationId: string) {
  const current = await assertOnboardedUser();
  const id = idSchema.parse(iterationId);
  const [iteration] = await db
    .select({
      id: projectIterations.id,
      projectId: projectIterations.projectId,
      projectSlug: projects.slug,
    })
    .from(projectIterations)
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .where(
      and(
        eq(projectIterations.id, id),
        eq(projectIterations.ownerId, current.user.id),
      ),
    )
    .limit(1);
  if (!iteration) throw new Error("Not found");

  const paths = await db
    .select({ pathname: iterationImages.blobPathname })
    .from(iterationImages)
    .where(eq(iterationImages.iterationId, id));
  if (paths.length) {
    await del(paths.map((item) => item.pathname), {
      token: getServerEnv().BLOB_READ_WRITE_TOKEN,
    });
  }
  await db.delete(projectIterations).where(eq(projectIterations.id, id));

  revalidatePath(`/dashboard/projects/${iteration.projectId}/edit`);
  revalidatePath(`/p/${iteration.projectSlug}`);
  redirect(`/dashboard/projects/${iteration.projectId}/edit?deleted=iteration`);
}

export async function deleteIterationImageAction(imageId: string) {
  const current = await assertOnboardedUser();
  const id = idSchema.parse(imageId);
  const [image] = await db
    .select({
      id: iterationImages.id,
      pathname: iterationImages.blobPathname,
      iterationId: projectIterations.id,
      projectId: projectIterations.projectId,
      projectSlug: projects.slug,
    })
    .from(iterationImages)
    .innerJoin(
      projectIterations,
      eq(iterationImages.iterationId, projectIterations.id),
    )
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .where(
      and(
        eq(iterationImages.id, id),
        eq(projectIterations.ownerId, current.user.id),
      ),
    )
    .limit(1);
  if (!image) throw new Error("Not found");

  await del(image.pathname, { token: getServerEnv().BLOB_READ_WRITE_TOKEN });
  await db.transaction(async (tx) => {
    const [currentIteration] = await tx
      .select({ status: projectIterations.status })
      .from(projectIterations)
      .where(
        and(
          eq(projectIterations.id, image.iterationId),
          eq(projectIterations.ownerId, current.user.id),
        ),
      )
      .for("update");
    if (!currentIteration) throw new Error("Not found");
    await tx.delete(iterationImages).where(eq(iterationImages.id, id));
    const remaining = await tx
      .select({ id: iterationImages.id })
      .from(iterationImages)
      .where(eq(iterationImages.iterationId, image.iterationId))
      .orderBy(asc(iterationImages.sortOrder));
    for (const [sortOrder, item] of remaining.entries()) {
      await tx
        .update(iterationImages)
        .set({ sortOrder: sortOrder + 10 })
        .where(eq(iterationImages.id, item.id));
    }
    for (const [sortOrder, item] of remaining.entries()) {
      await tx
        .update(iterationImages)
        .set({ sortOrder })
        .where(eq(iterationImages.id, item.id));
    }
    if (currentIteration.status === "approved") {
      await tx
        .update(projectIterations)
        .set({ status: "pending", submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(projectIterations.id, image.iterationId));
    } else if (currentIteration.status === "pending") {
      await tx
        .update(projectIterations)
        .set({ submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(projectIterations.id, image.iterationId));
    } else if (currentIteration.status === "rejected") {
      await tx
        .update(projectIterations)
        .set({ status: "draft", rejectionReason: null, submittedAt: null, updatedAt: new Date() })
        .where(eq(projectIterations.id, image.iterationId));
    } else {
      await tx
        .update(projectIterations)
        .set({ updatedAt: new Date() })
        .where(eq(projectIterations.id, image.iterationId));
    }
  });

  revalidatePath(
    `/dashboard/projects/${image.projectId}/iterations/${image.iterationId}/edit`,
  );
  revalidatePath(`/p/${image.projectSlug}`);
}

export async function reorderIterationImagesAction(
  iterationId: string,
  orderedImageIds: string[],
) {
  const current = await assertOnboardedUser();
  const id = idSchema.parse(iterationId);
  const ids = z.array(idSchema).min(1).max(3).parse(orderedImageIds);
  if (new Set(ids).size !== ids.length) throw new Error("Invalid image order.");

  const [iterationRows, existing] = await Promise.all([
    db
      .select({
        projectId: projectIterations.projectId,
        projectSlug: projects.slug,
      })
      .from(projectIterations)
      .innerJoin(projects, eq(projectIterations.projectId, projects.id))
      .where(
        and(
          eq(projectIterations.id, id),
          eq(projectIterations.ownerId, current.user.id),
        ),
      )
      .limit(1),
    db
      .select({ id: iterationImages.id })
      .from(iterationImages)
      .where(eq(iterationImages.iterationId, id)),
  ]);
  const iteration = iterationRows[0];
  if (!iteration || existing.length !== ids.length) throw new Error("Not found");
  if (!ids.every((imageId) => existing.some((item) => item.id === imageId))) {
    throw new Error("Forbidden");
  }

  await db.transaction(async (tx) => {
    const [currentIteration] = await tx
      .select({ status: projectIterations.status })
      .from(projectIterations)
      .where(
        and(
          eq(projectIterations.id, id),
          eq(projectIterations.ownerId, current.user.id),
        ),
      )
      .for("update");
    if (!currentIteration) throw new Error("Not found");
    for (const [sortOrder, imageId] of ids.entries()) {
      await tx
        .update(iterationImages)
        .set({ sortOrder: sortOrder + 10 })
        .where(eq(iterationImages.id, imageId));
    }
    for (const [sortOrder, imageId] of ids.entries()) {
      await tx
        .update(iterationImages)
        .set({ sortOrder })
        .where(eq(iterationImages.id, imageId));
    }
    if (currentIteration.status === "approved") {
      await tx
        .update(projectIterations)
        .set({ status: "pending", submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(projectIterations.id, id));
    } else if (currentIteration.status === "pending") {
      await tx
        .update(projectIterations)
        .set({ submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(projectIterations.id, id));
    } else if (currentIteration.status === "rejected") {
      await tx
        .update(projectIterations)
        .set({ status: "draft", rejectionReason: null, submittedAt: null, updatedAt: new Date() })
        .where(eq(projectIterations.id, id));
    } else {
      await tx
        .update(projectIterations)
        .set({ updatedAt: new Date() })
        .where(eq(projectIterations.id, id));
    }
  });

  revalidatePath(
    `/dashboard/projects/${iteration.projectId}/iterations/${id}/edit`,
  );
  revalidatePath(`/p/${iteration.projectSlug}`);
}
