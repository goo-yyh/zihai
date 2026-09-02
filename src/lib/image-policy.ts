export const UPLOAD_KINDS = [
  "avatar",
  "project-image",
  "project-qr-code",
] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

const MEBIBYTE = 1024 * 1024;

export const MAX_CONTENT_IMAGES = 5;

export const IMAGE_UPLOAD_POLICIES = {
  avatar: { maxFiles: 1, maxBytes: 2 * MEBIBYTE },
  "project-image": { maxFiles: MAX_CONTENT_IMAGES, maxBytes: 5 * MEBIBYTE },
  "project-qr-code": { maxFiles: 1, maxBytes: 5 * MEBIBYTE },
} as const satisfies Record<UploadKind, { maxFiles: number; maxBytes: number }>;

export function imageUploadPolicy(kind: UploadKind) {
  return IMAGE_UPLOAD_POLICIES[kind];
}
