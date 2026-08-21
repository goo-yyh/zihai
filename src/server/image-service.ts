import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { withTransaction, type DbTransaction } from "@/db";
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
import { deleteBlobsBestEffort } from "@/server/blob";

const TEMPORARY_SORT_OFFSET = 10;

type ImageTable = typeof projectImages | typeof iterationImages;

// Rewrites every position in two bulk statements: first shift all rows by the
// offset so intermediate values cannot collide on the unique sort index, then
// assign the final ranks. One statement per phase keeps this at a constant
// two round trips regardless of image count.
async function rewriteSortOrder(
  tx: DbTransaction,
  table: ImageTable,
  orderedIds: string[],
) {
  if (orderedIds.length === 0) return;
  const values = sql.join(
    orderedIds.map((imageId, rank) => sql`(${imageId}::uuid, ${rank}::int)`),
    sql`, `,
  );

  for (const offset of [TEMPORARY_SORT_OFFSET, 0]) {
    await tx.execute(sql`
      UPDATE ${table} AS image
      SET sort_order = position.rank + ${offset}
      FROM (VALUES ${values}) AS position(id, rank)
      WHERE image.id = position.id
    `);
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
  const deleted = await withTransaction(async (tx) => {
    const [image] = await tx
      .select({
        id: projectImages.id,
        pathname: projectImages.blobPathname,
        projectId: projects.id,
        slug: projects.slug,
        projectStatus: projects.status,
      })
      .from(projectImages)
      .innerJoin(projects, eq(projectImages.projectId, projects.id))
      .where(and(eq(projectImages.id, imageId), eq(projects.ownerId, ownerId)))
      .for("update");
    if (!image) throw new UserFacingError("Project image not found.");

    await tx.delete(projectImages).where(eq(projectImages.id, image.id));
    const remaining = await tx
      .select({ id: projectImages.id })
      .from(projectImages)
      .where(eq(projectImages.projectId, image.projectId))
      .orderBy(asc(projectImages.sortOrder));

    await rewriteSortOrder(
      tx,
      projectImages,
      remaining.map(({ id }) => id),
    );
    await tx
      .update(projects)
      .set({ ...contentEditPatch(image.projectStatus), publishedAt: null })
      .where(eq(projects.id, image.projectId));

    return image;
  });

  // The row is committed as deleted, so no page can serve the Blob anymore.
  // Cleanup after commit keeps the user off the Blob round trip; a failure
  // only orphans storage, which is logged server-side.
  await deleteBlobsBestEffort(deleted.pathname);

  return { projectId: deleted.projectId, slug: deleted.slug };
}

export async function reorderOwnedProjectImages(
  projectId: string,
  orderedImageIds: string[],
  ownerId: string,
) {
  return withTransaction(async (tx) => {
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

    await rewriteSortOrder(tx, projectImages, orderedImageIds);
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
  const deleted = await withTransaction(async (tx) => {
    const [image] = await tx
      .select({
        id: iterationImages.id,
        pathname: iterationImages.blobPathname,
        iterationId: projectIterations.id,
        projectId: projectIterations.projectId,
        projectSlug: projects.slug,
        iterationStatus: projectIterations.status,
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
      .for("update");
    if (!image) throw new UserFacingError("Iteration image not found.");

    await tx.delete(iterationImages).where(eq(iterationImages.id, image.id));
    const remaining = await tx
      .select({ id: iterationImages.id })
      .from(iterationImages)
      .where(eq(iterationImages.iterationId, image.iterationId))
      .orderBy(asc(iterationImages.sortOrder));

    await rewriteSortOrder(
      tx,
      iterationImages,
      remaining.map(({ id }) => id),
    );
    await tx
      .update(projectIterations)
      .set(iterationContentEditPatch(image.iterationStatus))
      .where(eq(projectIterations.id, image.iterationId));

    return image;
  });

  await deleteBlobsBestEffort(deleted.pathname);

  return {
    projectId: deleted.projectId,
    projectSlug: deleted.projectSlug,
    iterationId: deleted.iterationId,
  };
}

export async function reorderOwnedIterationImages(
  iterationId: string,
  orderedImageIds: string[],
  ownerId: string,
) {
  return withTransaction(async (tx) => {
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

    await rewriteSortOrder(tx, iterationImages, orderedImageIds);
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
