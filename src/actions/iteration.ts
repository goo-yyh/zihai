"use server";

import "server-only";

import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb, withTransaction } from "@/db";
import { iterationImages, projectIterations, projects } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import {
  assertImageCount,
  assertSubmittable,
  iterationContentEditPatch,
} from "@/lib/content-lifecycle";
import { UserFacingError } from "@/lib/errors";
import { assertFeatureEnabled } from "@/lib/features";
import { assertOnboardedUser } from "@/lib/session";
import { iterationInputSchema } from "@/lib/validations";
import { deleteBlobs } from "@/server/blob";
import {
  revalidateIterationWorkspace,
  revalidateProjectDetail,
} from "@/server/cache";
import type { ActionState } from "@/types/actions";

const idSchema = z.uuid();

function iterationInput(formData: FormData) {
  return iterationInputSchema.safeParse({
    versionLabel: formData.get("versionLabel"),
    description: formData.get("description"),
  });
}

export async function createIterationAction(
  projectId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertOnboardedUser();
  assertFeatureEnabled("iterations");
  const parsedProjectId = idSchema.safeParse(projectId);
  if (!parsedProjectId.success) {
    return { status: "error", message: "Invalid project." };
  }

  const parsed = iterationInput(formData);
  if (!parsed.success) return validationError(parsed.error);

  let iterationId: string;
  try {
    iterationId = await withTransaction(async (tx) => {
      const [project] = await tx
        .select({ id: projects.id, status: projects.status })
        .from(projects)
        .where(
          and(
            eq(projects.id, parsedProjectId.data),
            eq(projects.ownerId, session.user.id),
          ),
        )
        .for("update");
      if (!project) throw new UserFacingError("Project not found.");
      if (project.status !== "approved") {
        throw new UserFacingError(
          "Iterations can only be added to approved projects.",
        );
      }

      const [iteration] = await tx
        .insert(projectIterations)
        .values({
          projectId: project.id,
          ownerId: session.user.id,
          versionLabel: parsed.data.versionLabel || null,
          description: parsed.data.description,
        })
        .returning({ id: projectIterations.id });
      if (!iteration) throw new Error("Insert returned no iteration.");
      return iteration.id;
    });
  } catch (error) {
    return safeActionError(error, "Unable to create the iteration.");
  }

  redirect(
    `/dashboard/projects/${parsedProjectId.data}/iterations/${iterationId}/edit`,
  );
}

export async function updateIterationAction(
  iterationId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertOnboardedUser();
  assertFeatureEnabled("iterations");
  const parsedId = idSchema.safeParse(iterationId);
  if (!parsedId.success) {
    return { status: "error", message: "Invalid iteration." };
  }

  const parsed = iterationInput(formData);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const existing = await withTransaction(async (tx) => {
      const [ownedIteration] = await tx
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
            eq(projectIterations.ownerId, session.user.id),
          ),
        )
        .for("update");
      if (!ownedIteration) throw new UserFacingError("Iteration not found.");

      await tx
        .update(projectIterations)
        .set({
          versionLabel: parsed.data.versionLabel || null,
          description: parsed.data.description,
          ...iterationContentEditPatch(ownedIteration.status),
        })
        .where(
          and(
            eq(projectIterations.id, parsedId.data),
            eq(projectIterations.ownerId, session.user.id),
          ),
        );

      return ownedIteration;
    });

    revalidateIterationWorkspace(existing.projectId, parsedId.data);
    revalidateProjectDetail(existing.projectSlug);

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
  const session = await assertOnboardedUser();
  assertFeatureEnabled("iterations");
  const id = idSchema.parse(iterationId);

  const iteration = await withTransaction(async (tx) => {
    // Upload callbacks lock the same iteration row, so image persistence
    // cannot race between this count check and the submission transition.
    const [ownedIteration] = await tx
      .select({
        projectId: projectIterations.projectId,
        status: projectIterations.status,
        projectStatus: projects.status,
      })
      .from(projectIterations)
      .innerJoin(projects, eq(projectIterations.projectId, projects.id))
      .where(
        and(
          eq(projectIterations.id, id),
          eq(projectIterations.ownerId, session.user.id),
        ),
      )
      .for("update");
    if (!ownedIteration) throw new UserFacingError("Iteration not found.");
    if (ownedIteration.projectStatus !== "approved") {
      throw new UserFacingError(
        "The project must be approved before submitting an iteration.",
      );
    }
    assertSubmittable(ownedIteration.status, "iteration");

    const [images] = await tx
      .select({ value: count() })
      .from(iterationImages)
      .where(eq(iterationImages.iterationId, id));
    assertImageCount(images?.value ?? 0, "Iteration");

    const now = new Date();
    await tx
      .update(projectIterations)
      .set({
        status: "pending",
        rejectionReason: null,
        submittedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(projectIterations.id, id),
          eq(projectIterations.ownerId, session.user.id),
        ),
      );

    return ownedIteration;
  });

  revalidateIterationWorkspace(iteration.projectId, id);
  redirect(
    `/dashboard/projects/${iteration.projectId}/edit?submitted=iteration`,
  );
}

export async function deleteIterationAction(iterationId: string) {
  const session = await assertOnboardedUser();
  assertFeatureEnabled("iterations");
  const id = idSchema.parse(iterationId);

  const [iteration] = await getDb()
    .select({
      projectId: projectIterations.projectId,
      projectSlug: projects.slug,
    })
    .from(projectIterations)
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .where(
      and(
        eq(projectIterations.id, id),
        eq(projectIterations.ownerId, session.user.id),
      ),
    )
    .limit(1);
  if (!iteration) throw new UserFacingError("Iteration not found.");

  const paths = await getDb()
    .select({ pathname: iterationImages.blobPathname })
    .from(iterationImages)
    .where(eq(iterationImages.iterationId, id));
  await deleteBlobs(paths.map(({ pathname }) => pathname));
  await getDb()
    .delete(projectIterations)
    .where(
      and(
        eq(projectIterations.id, id),
        eq(projectIterations.ownerId, session.user.id),
      ),
    );

  revalidateIterationWorkspace(iteration.projectId, id);
  revalidateProjectDetail(iteration.projectSlug);
  redirect(`/dashboard/projects/${iteration.projectId}/edit?deleted=iteration`);
}
