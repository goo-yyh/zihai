import "server-only";

import { and, eq, max } from "drizzle-orm";

import { db } from "@/db";
import {
  iterationImages,
  projectImages,
  projectIterations,
  projects,
  user,
} from "@/db/schema";
import {
  contentEditPatch,
  iterationContentEditPatch,
} from "@/lib/content-lifecycle";
import { UserFacingError } from "@/lib/errors";
import type { UploadIntent } from "@/lib/upload-intent";
import { ALLOWED_IMAGE_TYPES } from "@/lib/validations";
import { deleteBlobsBestEffort, inspectBlob, uploadLimit } from "@/server/blob";
import { validateUploadOwnership } from "@/server/upload-policy";

type UploadedBlob = {
  url: string;
  pathname: string;
};

export type PersistedUpload =
  | { kind: "avatar"; username: string | null }
  | {
      kind: "project-image";
      projectId: string;
      projectSlug: string;
      ownerUsername: string | null;
    }
  | {
      kind: "iteration-image";
      projectId: string;
      projectSlug: string;
      iterationId: string;
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

  const metadata = await verifiedBlobMetadata(blob, intent);

  if (intent.kind === "avatar") {
    const [existing] = await db
      .select({ pathname: user.avatarPathname, username: user.username })
      .from(user)
      .where(eq(user.id, intent.userId))
      .limit(1);
    if (!existing) throw new UserFacingError("User not found.");

    await db
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
    return { kind: "avatar", username: existing.username };
  }

  await validateUploadOwnership(intent);

  if (intent.kind === "project-image" && intent.projectId) {
    const project = await db.transaction(async (tx) => {
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
    const [owner] = await db
      .select({ username: user.username })
      .from(user)
      .where(eq(user.id, intent.userId))
      .limit(1);

    return {
      kind: "project-image",
      projectId: intent.projectId,
      projectSlug: project.slug,
      ownerUsername: owner?.username ?? null,
    };
  }

  if (!intent.iterationId || !intent.projectId) {
    throw new UserFacingError("Iteration and project are required.");
  }

  const projectSlug = await db.transaction(async (tx) => {
    const [iteration] = await tx
      .select({
        status: projectIterations.status,
        projectSlug: projects.slug,
      })
      .from(projectIterations)
      .innerJoin(projects, eq(projectIterations.projectId, projects.id))
      .where(
        and(
          eq(projectIterations.id, intent.iterationId!),
          eq(projectIterations.projectId, intent.projectId!),
          eq(projectIterations.ownerId, intent.userId),
        ),
      )
      .for("update");
    if (!iteration) throw new UserFacingError("Iteration not found.");

    const [position] = await tx
      .select({ value: max(iterationImages.sortOrder) })
      .from(iterationImages)
      .where(eq(iterationImages.iterationId, intent.iterationId!));
    await tx.insert(iterationImages).values({
      iterationId: intent.iterationId!,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      mimeType: metadata.contentType,
      sizeBytes: metadata.size,
      sortOrder: (position?.value ?? -1) + 1,
    });
    await tx
      .update(projectIterations)
      .set(iterationContentEditPatch(iteration.status))
      .where(eq(projectIterations.id, intent.iterationId!));

    return iteration.projectSlug;
  });

  return {
    kind: "iteration-image",
    projectId: intent.projectId,
    projectSlug,
    iterationId: intent.iterationId,
  };
}
