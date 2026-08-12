"use server";

import "server-only";

import { del } from "@vercel/blob";
import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  projectImages,
  projectLikes,
  projects,
} from "@/db/schema";
import { getImagePathnamesForProject } from "@/db/queries/dashboard";
import { safeActionError, validationError } from "@/lib/action-utils";
import { getServerEnv } from "@/lib/env";
import { assertOnboardedUser } from "@/lib/session";
import { slugify, withSlugSuffix } from "@/lib/slug";
import { projectInputSchema } from "@/lib/validations";
import type { ActionState } from "@/types/actions";

const idSchema = z.uuid();

async function createUniqueSlug(name: string) {
  const base = slugify(name);
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const slug = withSlugSuffix(base, attempt);
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    if (!existing) return slug;
  }
  return `${base || "project"}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createProjectAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await assertOnboardedUser();
  const parsed = projectInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    websiteUrl: formData.get("websiteUrl"),
    githubUrl: formData.get("githubUrl"),
  });
  if (!parsed.success) return validationError(parsed.error);

  let createdProjectId: string;
  try {
    const slug = await createUniqueSlug(parsed.data.name);
    const [project] = await db
      .insert(projects)
      .values({
        ownerId: current.user.id,
        slug,
        ...parsed.data,
      })
      .returning({ id: projects.id });

    if (!project) throw new Error("Unable to create project.");
    createdProjectId = project.id;
  } catch (error) {
    return safeActionError(error, "Unable to create the project.");
  }
  redirect(`/dashboard/projects/${createdProjectId}/edit`);
}

export async function updateProjectAction(
  projectId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await assertOnboardedUser();
  const parsedId = idSchema.safeParse(projectId);
  if (!parsedId.success) return { status: "error", message: "Invalid project." };

  const parsed = projectInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    websiteUrl: formData.get("websiteUrl"),
    githubUrl: formData.get("githubUrl"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const [existing] = await db
      .select({ status: projects.status, slug: projects.slug })
      .from(projects)
      .where(
        and(eq(projects.id, parsedId.data), eq(projects.ownerId, current.user.id)),
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
      .update(projects)
      .set({
        ...parsed.data,
        status: nextStatus,
        rejectionReason: null,
        submittedAt: nextStatus === "pending" ? new Date() : null,
        approvedAt: nextStatus === "pending" ? null : undefined,
        approvedBy: nextStatus === "pending" ? null : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(eq(projects.id, parsedId.data), eq(projects.ownerId, current.user.id)),
      );

    revalidatePath(`/dashboard/projects/${parsedId.data}/edit`);
    revalidatePath(`/p/${existing.slug}`);
    revalidatePath("/");

    return {
      status: "success",
      message:
        existing.status === "approved"
          ? "Changes saved and submitted for review. The public page is hidden until approval."
          : "Project saved.",
    };
  } catch (error) {
    return safeActionError(error, "Unable to save the project.");
  }
}

export async function submitProjectAction(projectId: string) {
  const current = await assertOnboardedUser();
  const id = idSchema.parse(projectId);

  const [project] = await db
    .select({ id: projects.id, status: projects.status, slug: projects.slug })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, current.user.id)))
    .limit(1);
  if (!project) throw new Error("Not found");
  if (!["draft", "rejected"].includes(project.status)) {
    throw new Error("Only draft or rejected projects can be submitted.");
  }

  const [images] = await db
    .select({ value: count() })
    .from(projectImages)
    .where(eq(projectImages.projectId, id));
  if (!images || images.value < 1 || images.value > 3) {
    throw new Error("Project must have between 1 and 3 images.");
  }

  await db
    .update(projects)
    .set({
      status: "pending",
      rejectionReason: null,
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), eq(projects.ownerId, current.user.id)));

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${id}/edit`);
  redirect("/dashboard?submitted=project");
}

export async function deleteProjectAction(projectId: string) {
  const current = await assertOnboardedUser();
  const id = idSchema.parse(projectId);
  const [project] = await db
    .select({ id: projects.id, slug: projects.slug })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, current.user.id)))
    .limit(1);
  if (!project) throw new Error("Not found");

  const pathnames = await getImagePathnamesForProject(id);
  if (pathnames.length) {
    await del(pathnames, { token: getServerEnv().BLOB_READ_WRITE_TOKEN });
  }

  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath("/");
  revalidatePath(`/p/${project.slug}`);
  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=project");
}

export async function deleteProjectImageAction(imageId: string) {
  const current = await assertOnboardedUser();
  const id = idSchema.parse(imageId);
  const [image] = await db
    .select({
      id: projectImages.id,
      pathname: projectImages.blobPathname,
      projectId: projects.id,
      ownerId: projects.ownerId,
      slug: projects.slug,
    })
    .from(projectImages)
    .innerJoin(projects, eq(projectImages.projectId, projects.id))
    .where(and(eq(projectImages.id, id), eq(projects.ownerId, current.user.id)))
    .limit(1);
  if (!image) throw new Error("Not found");

  await del(image.pathname, { token: getServerEnv().BLOB_READ_WRITE_TOKEN });
  await db.transaction(async (tx) => {
    const [currentProject] = await tx
      .select({ status: projects.status })
      .from(projects)
      .where(and(eq(projects.id, image.projectId), eq(projects.ownerId, current.user.id)))
      .for("update");
    if (!currentProject) throw new Error("Not found");
    await tx.delete(projectImages).where(eq(projectImages.id, id));
    const remaining = await tx
      .select({ id: projectImages.id })
      .from(projectImages)
      .where(eq(projectImages.projectId, image.projectId))
      .orderBy(asc(projectImages.sortOrder));
    for (const [sortOrder, item] of remaining.entries()) {
      await tx
        .update(projectImages)
        .set({ sortOrder: sortOrder + 10 })
        .where(eq(projectImages.id, item.id));
    }
    for (const [sortOrder, item] of remaining.entries()) {
      await tx
        .update(projectImages)
        .set({ sortOrder })
        .where(eq(projectImages.id, item.id));
    }
    if (currentProject.status === "approved") {
      await tx
        .update(projects)
        .set({ status: "pending", submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(projects.id, image.projectId));
    } else if (currentProject.status === "pending") {
      await tx
        .update(projects)
        .set({ submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(projects.id, image.projectId));
    } else if (currentProject.status === "rejected") {
      await tx
        .update(projects)
        .set({ status: "draft", rejectionReason: null, submittedAt: null, updatedAt: new Date() })
        .where(eq(projects.id, image.projectId));
    } else {
      await tx
        .update(projects)
        .set({ updatedAt: new Date() })
        .where(eq(projects.id, image.projectId));
    }
  });

  revalidatePath(`/dashboard/projects/${image.projectId}/edit`);
  revalidatePath(`/p/${image.slug}`);
  revalidatePath("/");
}

export async function reorderProjectImagesAction(
  projectId: string,
  orderedImageIds: string[],
) {
  const current = await assertOnboardedUser();
  const id = idSchema.parse(projectId);
  const ids = z.array(idSchema).min(1).max(3).parse(orderedImageIds);
  if (new Set(ids).size !== ids.length) throw new Error("Invalid image order.");

  const [project, existing] = await Promise.all([
    db
      .select({ slug: projects.slug })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, current.user.id)))
      .limit(1),
    db
      .select({ id: projectImages.id })
      .from(projectImages)
      .where(eq(projectImages.projectId, id)),
  ]);
  const projectRow = project[0];
  if (!projectRow || existing.length !== ids.length) throw new Error("Not found");
  if (!ids.every((imageId) => existing.some((item) => item.id === imageId))) {
    throw new Error("Forbidden");
  }

  await db.transaction(async (tx) => {
    const [currentProject] = await tx
      .select({ status: projects.status })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, current.user.id)))
      .for("update");
    if (!currentProject) throw new Error("Not found");
    for (const [position, imageId] of ids.entries()) {
      await tx
        .update(projectImages)
        .set({ sortOrder: position + 10 })
        .where(eq(projectImages.id, imageId));
    }
    for (const [position, imageId] of ids.entries()) {
      await tx
        .update(projectImages)
        .set({ sortOrder: position })
        .where(eq(projectImages.id, imageId));
    }
    if (currentProject.status === "approved") {
      await tx
        .update(projects)
        .set({ status: "pending", submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(projects.id, id));
    } else if (currentProject.status === "pending") {
      await tx
        .update(projects)
        .set({ submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(projects.id, id));
    } else if (currentProject.status === "rejected") {
      await tx
        .update(projects)
        .set({ status: "draft", rejectionReason: null, submittedAt: null, updatedAt: new Date() })
        .where(eq(projects.id, id));
    } else {
      await tx
        .update(projects)
        .set({ updatedAt: new Date() })
        .where(eq(projects.id, id));
    }
  });

  revalidatePath(`/dashboard/projects/${id}/edit`);
  revalidatePath(`/p/${projectRow.slug}`);
  revalidatePath("/");
}

export async function getProjectLikeState(projectId: string, userId: string) {
  const [row] = await db
    .select({ userId: projectLikes.userId })
    .from(projectLikes)
    .where(
      and(eq(projectLikes.projectId, projectId), eq(projectLikes.userId, userId)),
    )
    .limit(1);
  return Boolean(row);
}
