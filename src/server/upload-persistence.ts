import "server-only";

import { and, eq, max } from "drizzle-orm";

import { getDb, withTransaction } from "@/db";
import { projectImages, projects, user } from "@/db/schema";
import { contentEditPatch } from "@/lib/content-lifecycle";
import { UserFacingError } from "@/lib/errors";
import { ALLOWED_IMAGE_TYPES } from "@/lib/image-policy";
import type { UploadIntent } from "@/lib/upload-intent";
import { deleteBlobsBestEffort, inspectBlob, uploadLimit } from "@/server/blob";
import { validateUploadOwnership } from "@/server/upload-policy";

export type UploadedBlob = {
  url: string;
  pathname: string;
};

export type PersistedUpload =
  | { kind: "avatar"; userId: string; username: string | null }
  | {
      kind: "project-image";
      projectId: string;
      projectSlug: string;
      ownerId: string;
      ownerUsername: string | null;
    };

async function verifiedBlobMetadata(blob: UploadedBlob, intent: UploadIntent) {
  const metadata = await inspectBlob(blob.url);
  const allowedType = ALLOWED_IMAGE_TYPES.includes(
    metadata.contentType as (typeof ALLOWED_IMAGE_TYPES)[number],
  );

  if (
    !allowedType ||
    metadata.contentType !== intent.contentType ||
    metadata.size > uploadLimit(intent.kind)
  ) {
    throw new UserFacingError("Uploaded file violates the image policy.");
  }

  return metadata;
}

export async function persistUpload(
  blob: UploadedBlob,
  intent: UploadIntent,
): Promise<PersistedUpload> {
  if (intent.pathname !== blob.pathname) {
    throw new UserFacingError("Upload pathname mismatch.");
  }

  // The two checks are independent network calls (Blob metadata HEAD and the
  // ownership read), so they run concurrently instead of paying two round
  // trips back to back.
  const metadataTask = verifiedBlobMetadata(blob, intent);
  const ownershipTask =
    intent.kind === "avatar" ? null : validateUploadOwnership(intent);
  const metadata = await metadataTask;

  if (intent.kind === "avatar") {
    const [existing] = await getDb()
      .select({ pathname: user.avatarPathname, username: user.username })
      .from(user)
      .where(eq(user.id, intent.userId))
      .limit(1);
    if (!existing) throw new UserFacingError("User not found.");

    await getDb()
      .update(user)
      .set({
        image: blob.url,
        avatarPathname: blob.pathname,
        updatedAt: new Date(),
      })
      .where(eq(user.id, intent.userId));

    if (existing.pathname && existing.pathname !== blob.pathname) {
      await deleteBlobsBestEffort(existing.pathname);
    }
    return {
      kind: "avatar",
      userId: intent.userId,
      username: existing.username,
    };
  }

  await ownershipTask;

  if (intent.kind === "project-image" && intent.projectId) {
    const project = await withTransaction(async (tx) => {
      const [ownedProject] = await tx
        .select({ status: projects.status, slug: projects.slug })
        .from(projects)
        .where(
          and(
            eq(projects.id, intent.projectId!),
            eq(projects.ownerId, intent.userId),
          ),
        )
        .for("update");
      if (!ownedProject) throw new UserFacingError("Project not found.");

      const [existingImage] = await tx
        .select({ id: projectImages.id })
        .from(projectImages)
        .where(
          and(
            eq(projectImages.projectId, intent.projectId!),
            eq(projectImages.blobPathname, blob.pathname),
          ),
        )
        .limit(1);
      if (existingImage) return ownedProject;

      const [position] = await tx
        .select({ value: max(projectImages.sortOrder) })
        .from(projectImages)
        .where(eq(projectImages.projectId, intent.projectId!));
      await tx.insert(projectImages).values({
        projectId: intent.projectId!,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        mimeType: metadata.contentType,
        sizeBytes: metadata.size,
        sortOrder: (position?.value ?? -1) + 1,
      });
      await tx
        .update(projects)
        .set({ ...contentEditPatch(ownedProject.status), publishedAt: null })
        .where(eq(projects.id, intent.projectId!));

      return ownedProject;
    });
    const [owner] = await getDb()
      .select({ username: user.username })
      .from(user)
      .where(eq(user.id, intent.userId))
      .limit(1);

    return {
      kind: "project-image",
      projectId: intent.projectId,
      projectSlug: project.slug,
      ownerId: intent.userId,
      ownerUsername: owner?.username ?? null,
    };
  }

  throw new UserFacingError("Unsupported upload kind.");
}
