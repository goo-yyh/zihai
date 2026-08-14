import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  iterationImages,
  projectImages,
  projectIterations,
  projects,
} from "@/db/schema";
import {
  contentEditPatch,
  iterationContentEditPatch,
} from "@/lib/content-lifecycle";
import { UserFacingError } from "@/lib/errors";
import { deleteBlobs } from "@/server/blob";

const TEMPORARY_SORT_OFFSET = 10;

async function rewriteSortOrder(
  orderedIds: string[],
  update: (imageId: string, sortOrder: number) => Promise<unknown>,
) {
  for (const [sortOrder, imageId] of orderedIds.entries()) {
    await update(imageId, sortOrder + TEMPORARY_SORT_OFFSET);
  }
  for (const [sortOrder, imageId] of orderedIds.entries()) {
    await update(imageId, sortOrder);
  }
}

function assertExactImageSet(existingIds: string[], orderedIds: string[]) {
  if (
    existingIds.length !== orderedIds.length ||
    new Set(orderedIds).size !== orderedIds.length ||
    !orderedIds.every((id) => existingIds.includes(id))
  ) {
    throw new UserFacingError("Invalid image order.");
  }
}

export async function deleteOwnedProjectImage(
  imageId: string,
  ownerId: string,
) {
  const [image] = await getDb()
    .select({
      id: projectImages.id,
      pathname: projectImages.blobPathname,
      projectId: projects.id,
      slug: projects.slug,
    })
    .from(projectImages)
    .innerJoin(projects, eq(projectImages.projectId, projects.id))
    .where(and(eq(projectImages.id, imageId), eq(projects.ownerId, ownerId)))
    .limit(1);
  if (!image) throw new UserFacingError("Project image not found.");

  // Blob and Postgres cannot share a transaction. Deleting the Blob first
  // guarantees a successful action never leaves an orphaned object.
  await deleteBlobs(image.pathname);

  await getDb().transaction(async (tx) => {
    const [project] = await tx
      .select({ status: projects.status })
      .from(projects)
      .where(
        and(eq(projects.id, image.projectId), eq(projects.ownerId, ownerId)),
      )
      .for("update");
    if (!project) throw new UserFacingError("Project not found.");

    await tx.delete(projectImages).where(eq(projectImages.id, image.id));
    const remaining = await tx
      .select({ id: projectImages.id })
      .from(projectImages)
      .where(eq(projectImages.projectId, image.projectId))
      .orderBy(asc(projectImages.sortOrder));

    await rewriteSortOrder(
      remaining.map(({ id }) => id),
      (id, sortOrder) =>
        tx
          .update(projectImages)
          .set({ sortOrder })
          .where(eq(projectImages.id, id)),
    );
    await tx
      .update(projects)
      .set({ ...contentEditPatch(project.status), publishedAt: null })
      .where(eq(projects.id, image.projectId));
  });

  return { projectId: image.projectId, slug: image.slug };
}

export async function reorderOwnedProjectImages(
  projectId: string,
  orderedImageIds: string[],
  ownerId: string,
) {
  return getDb().transaction(async (tx) => {
    const [project] = await tx
      .select({ status: projects.status, slug: projects.slug })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
      .for("update");
    if (!project) throw new UserFacingError("Project not found.");

    const existing = await tx
      .select({ id: projectImages.id })
      .from(projectImages)
      .where(eq(projectImages.projectId, projectId));
    assertExactImageSet(
      existing.map(({ id }) => id),
      orderedImageIds,
    );

    await rewriteSortOrder(orderedImageIds, (imageId, sortOrder) =>
      tx
        .update(projectImages)
        .set({ sortOrder })
        .where(eq(projectImages.id, imageId)),
    );
    await tx
      .update(projects)
      .set({ ...contentEditPatch(project.status), publishedAt: null })
      .where(eq(projects.id, projectId));

    return { projectId, slug: project.slug };
  });
}

export async function deleteOwnedIterationImage(
  imageId: string,
  ownerId: string,
) {
  const [image] = await getDb()
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
        eq(iterationImages.id, imageId),
        eq(projectIterations.ownerId, ownerId),
      ),
    )
    .limit(1);
  if (!image) throw new UserFacingError("Iteration image not found.");

  await deleteBlobs(image.pathname);

  await getDb().transaction(async (tx) => {
    const [iteration] = await tx
      .select({ status: projectIterations.status })
      .from(projectIterations)
      .where(
        and(
          eq(projectIterations.id, image.iterationId),
          eq(projectIterations.ownerId, ownerId),
        ),
      )
      .for("update");
    if (!iteration) throw new UserFacingError("Iteration not found.");

    await tx.delete(iterationImages).where(eq(iterationImages.id, image.id));
    const remaining = await tx
      .select({ id: iterationImages.id })
      .from(iterationImages)
      .where(eq(iterationImages.iterationId, image.iterationId))
      .orderBy(asc(iterationImages.sortOrder));

    await rewriteSortOrder(
      remaining.map(({ id }) => id),
      (id, sortOrder) =>
        tx
          .update(iterationImages)
          .set({ sortOrder })
          .where(eq(iterationImages.id, id)),
    );
    await tx
      .update(projectIterations)
      .set(iterationContentEditPatch(iteration.status))
      .where(eq(projectIterations.id, image.iterationId));
  });

  return {
    projectId: image.projectId,
    projectSlug: image.projectSlug,
    iterationId: image.iterationId,
  };
}

export async function reorderOwnedIterationImages(
  iterationId: string,
  orderedImageIds: string[],
  ownerId: string,
) {
  return getDb().transaction(async (tx) => {
    const [iteration] = await tx
      .select({
        status: projectIterations.status,
        projectId: projectIterations.projectId,
        projectSlug: projects.slug,
      })
      .from(projectIterations)
      .innerJoin(projects, eq(projectIterations.projectId, projects.id))
      .where(
        and(
          eq(projectIterations.id, iterationId),
          eq(projectIterations.ownerId, ownerId),
        ),
      )
      .for("update");
    if (!iteration) throw new UserFacingError("Iteration not found.");

    const existing = await tx
      .select({ id: iterationImages.id })
      .from(iterationImages)
      .where(eq(iterationImages.iterationId, iterationId));
    assertExactImageSet(
      existing.map(({ id }) => id),
      orderedImageIds,
    );

    await rewriteSortOrder(orderedImageIds, (imageId, sortOrder) =>
      tx
        .update(iterationImages)
        .set({ sortOrder })
        .where(eq(iterationImages.id, imageId)),
    );
    await tx
      .update(projectIterations)
      .set(iterationContentEditPatch(iteration.status))
      .where(eq(projectIterations.id, iterationId));

    return {
      projectId: iteration.projectId,
      projectSlug: iteration.projectSlug,
      iterationId,
    };
  });
}
