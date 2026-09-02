import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDb, withTransaction } from "@/db";
import { projectImages, projects, user } from "@/db/schema";
import type { UploadIntent } from "@/lib/upload-intent";
import { deleteBlobsBestEffort } from "@/server/blob";
import {
  revalidateProjectWorkspace,
  revalidatePublicProject,
  revalidateUserPresentation,
} from "@/server/cache";
import {
  persistUpload,
  type PersistedUpload,
  type UploadedBlob,
} from "@/server/upload-persistence";

function refreshUploadConsumers(upload: PersistedUpload) {
  if (upload.kind === "avatar") {
    revalidateUserPresentation(upload.userId, upload.username);
    return;
  }

  if (upload.kind === "project-image" || upload.kind === "project-qr-code") {
    revalidateProjectWorkspace(upload.projectId);
    revalidatePublicProject(
      { id: upload.projectId, slug: upload.projectSlug },
      { id: upload.ownerId, username: upload.ownerUsername },
    );
  }
}

async function compensateFailedUpload(pathname: string) {
  try {
    const db = getDb();
    const [avatarReferences, imageReferences, qrCodeReferences] =
      await db.batch([
        db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.avatarPathname, pathname))
          .limit(1),
        db
          .select({ id: projectImages.id })
          .from(projectImages)
          .where(eq(projectImages.blobPathname, pathname))
          .limit(1),
        db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.qrCodePathname, pathname))
          .limit(1),
      ]);

    if (
      avatarReferences.length > 0 ||
      imageReferences.length > 0 ||
      qrCodeReferences.length > 0
    ) {
      return;
    }
  } catch (error) {
    // Losing an unreferenced-object cleanup is safer than deleting a Blob that
    // a concurrent or duplicate completion may already have committed.
    console.error("Upload compensation reference check failed", error);
    return;
  }

  await deleteBlobsBestEffort(pathname);
}

export async function completeUpload(blob: UploadedBlob, intent: UploadIntent) {
  // This outer transaction only provides a cross-instance pathname mutex.
  // persistUpload keeps its existing independent write transaction so its row
  // locks and metadata mutation still commit or roll back as one unit.
  const persisted = await withTransaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`upload-completion:${intent.pathname}`}, 0))`,
    );

    try {
      return await persistUpload(blob, intent);
    } catch (error) {
      // The completion payload is client-controlled. Only the pathname covered
      // by the verified upload intent is safe to use as a compensation target.
      // The pathname mutex prevents another completion from committing between
      // the persisted-reference check and a compensating delete.
      await compensateFailedUpload(intent.pathname);
      throw error;
    }
  });

  // Cache invalidation happens only after persistence and the pathname mutex
  // transaction succeed. A cache failure must never trigger compensation that
  // deletes a referenced Blob.
  refreshUploadConsumers(persisted);
  return persisted;
}
