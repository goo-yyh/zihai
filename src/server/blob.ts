import "server-only";

import { del, head } from "@vercel/blob";

import { getServerEnv } from "@/lib/env";
import { imageUploadPolicy, type UploadKind } from "@/lib/image-policy";

export function uploadLimit(kind: UploadKind) {
  return imageUploadPolicy(kind).maxBytes;
}

export async function inspectBlob(url: string) {
  return head(url, { token: getServerEnv().BLOB_READ_WRITE_TOKEN });
}

export async function deleteBlobs(pathnames: string | string[]) {
  const targets = Array.isArray(pathnames) ? pathnames : [pathnames];
  if (targets.length === 0) return;

  await del(targets, { token: getServerEnv().BLOB_READ_WRITE_TOKEN });
}

/**
 * Use only after the database has committed to a replacement object. At that
 * point an orphaned old Blob is preferable to a database row that references
 * a newly deleted object.
 */
export async function deleteBlobsBestEffort(pathnames: string | string[]) {
  try {
    await deleteBlobs(pathnames);
  } catch (error) {
    console.error("Blob cleanup failed", error);
  }
}
