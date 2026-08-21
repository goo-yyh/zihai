import "server-only";

import type { UploadIntent } from "@/lib/upload-intent";
import { deleteBlobsBestEffort } from "@/server/blob";
import {
  revalidateIterationWorkspace,
  revalidateProjectDetail,
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
    revalidateUserPresentation(upload.username);
    return;
  }

  if (upload.kind === "project-image") {
    revalidateProjectWorkspace(upload.projectId);
    revalidatePublicProject(upload.projectSlug, upload.ownerUsername);
    return;
  }

  revalidateIterationWorkspace(upload.projectId, upload.iterationId);
  revalidateProjectDetail(upload.projectSlug);
}

export async function completeUpload(blob: UploadedBlob, intent: UploadIntent) {
  let persisted: PersistedUpload;
  try {
    persisted = await persistUpload(blob, intent);
  } catch (error) {
    await deleteBlobsBestEffort(blob.pathname);
    throw error;
  }

  // Cache invalidation happens only after persistence succeeds. A cache
  // failure must never trigger compensation that deletes a referenced Blob.
  refreshUploadConsumers(persisted);
  return persisted;
}
