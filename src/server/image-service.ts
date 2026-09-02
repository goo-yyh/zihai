import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { withTransaction, type DbTransaction } from "@/db";
import { projectImages, projects } from "@/db/schema";
import {
  assertProjectDestinationForStatus,
  contentEditPatch,
} from "@/lib/content-lifecycle";
import { UserFacingError } from "@/lib/errors";
import { deleteBlobsBestEffort } from "@/server/blob";

const TEMPORARY_SORT_OFFSET = 10;

// Rewrites every position in two bulk statements: first shift all rows by the
// offset so intermediate values cannot collide on the unique sort index, then
// assign the final ranks. One statement per phase keeps this at a constant
// two round trips regardless of image count.
async function rewriteSortOrder(tx: DbTransaction, orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const values = sql.join(
    orderedIds.map((imageId, rank) => sql`(${imageId}::uuid, ${rank}::int)`),
    sql`, `,
  );

  for (const offset of [TEMPORARY_SORT_OFFSET, 0]) {
    await tx.execute(sql`
      UPDATE ${projectImages} AS image
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

export async function deleteOwnedProjectQrCode(
  projectId: string,
  ownerId: string,
) {
  const deleted = await withTransaction(async (tx) => {
    const [project] = await tx
      .select({
        slug: projects.slug,
        status: projects.status,
        websiteUrl: projects.websiteUrl,
        githubUrl: projects.githubUrl,
        qrCodeUrl: projects.qrCodeUrl,
        qrCodePathname: projects.qrCodePathname,
      })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
      .for("update");
    if (!project) throw new UserFacingError("Project not found.");
    if (!project.qrCodeUrl || !project.qrCodePathname) {
      throw new UserFacingError("Project QR code not found.");
    }

    const editPatch = contentEditPatch(project.status);
    assertProjectDestinationForStatus(editPatch.status, {
      websiteUrl: project.websiteUrl,
      githubUrl: project.githubUrl,
      qrCodeUrl: null,
    });

    await tx
      .update(projects)
      .set({
        qrCodeUrl: null,
        qrCodePathname: null,
        ...editPatch,
        publishedAt: null,
      })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));

    return { slug: project.slug, pathname: project.qrCodePathname };
  });

  // The database no longer exposes this object. Cleanup after commit means a
  // provider failure can only leave an orphan; it cannot break a live QR code.
  await deleteBlobsBestEffort(deleted.pathname);

  return { projectId, slug: deleted.slug };
}

export async function deleteOwnedProject(projectId: string, ownerId: string) {
  const deleted = await withTransaction(async (tx) => {
    // Upload callbacks lock this same project row before inserting screenshots
    // or replacing the QR code. Capturing paths behind the lock therefore sees
    // the final committed set that the project deletion will remove.
    const [project] = await tx
      .select({ slug: projects.slug, qrCodePathname: projects.qrCodePathname })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
      .for("update");
    if (!project) throw new UserFacingError("Project not found.");

    const imagePathnames = await tx
      .select({ pathname: projectImages.blobPathname })
      .from(projectImages)
      .where(eq(projectImages.projectId, projectId));

    await tx
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));

    return {
      slug: project.slug,
      pathnames: [
        ...imagePathnames.map(({ pathname }) => pathname),
        ...(project.qrCodePathname ? [project.qrCodePathname] : []),
      ],
    };
  });

  // Once the relational delete commits, a cleanup failure can only orphan
  // storage; it cannot leave a surviving project pointing at deleted objects.
  await deleteBlobsBestEffort(deleted.pathnames);
  return { projectId, slug: deleted.slug };
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

    await rewriteSortOrder(tx, orderedImageIds);
    await tx
      .update(projects)
      .set({ ...contentEditPatch(project.status), publishedAt: null })
      .where(eq(projects.id, projectId));

    return { projectId, slug: project.slug };
  });
}
