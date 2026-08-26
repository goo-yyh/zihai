import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { ALLOWED_IMAGE_TYPES, UPLOAD_KINDS } from "@/lib/image-policy";

const signedUploadIntentSchema = z.object({
  kind: z.enum(UPLOAD_KINDS),
  userId: z.string().min(1),
  pathname: z.string().min(1),
  projectId: z.uuid().optional(),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  expiresAt: z.number().int().positive(),
});

export type UploadIntent = z.infer<typeof signedUploadIntentSchema>;

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string) {
  return createHmac("sha256", getServerEnv().BETTER_AUTH_SECRET)
    .update(payload)
    .digest("base64url");
}

export function signUploadIntent(intent: UploadIntent) {
  const payload = encode(JSON.stringify(intent));
  return `${payload}.${signature(payload)}`;
}

export function verifyUploadIntent(token: string) {
  const [payload, providedSignature] = token.split(".");
  if (!payload || !providedSignature) throw new Error("Invalid upload intent.");

  const expected = Buffer.from(signature(payload));
  const provided = Buffer.from(providedSignature);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    throw new Error("Invalid upload intent.");
  }

  const parsed = signedUploadIntentSchema.parse(JSON.parse(decode(payload)));
  if (parsed.expiresAt < Date.now()) throw new Error("Upload intent expired.");
  return parsed;
}

export function extensionForContentType(
  contentType: UploadIntent["contentType"],
) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  return "webp";
}
