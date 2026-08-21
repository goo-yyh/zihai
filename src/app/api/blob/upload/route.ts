import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getAuth } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { publicErrorMessage, UserFacingError } from "@/lib/errors";
import { ALLOWED_IMAGE_TYPES } from "@/lib/image-policy";
import { verifyUploadIntent } from "@/lib/upload-intent";
import { uploadKindSchema } from "@/lib/validations";
import { deleteBlobsBestEffort, uploadLimit } from "@/server/blob";
import { completeUpload } from "@/server/upload-completion";
import { authorizeUpload, issueUploadIntent } from "@/server/upload-policy";

const issueIntentSchema = z.object({
  kind: uploadKindSchema,
  projectId: z.uuid().optional(),
  iterationId: z.uuid().optional(),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
});

export async function GET(request: NextRequest) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = issueIntentSchema.safeParse({
    kind: request.nextUrl.searchParams.get("kind"),
    projectId: request.nextUrl.searchParams.get("projectId") || undefined,
    iterationId: request.nextUrl.searchParams.get("iterationId") || undefined,
    contentType: request.nextUrl.searchParams.get("contentType"),
  });
  if (!parsed.success) {
    return Response.json({ error: "Invalid upload request." }, { status: 400 });
  }

  try {
    const intent = await issueUploadIntent(parsed.data, {
      id: session.user.id,
      onboardingCompleted: session.user.onboardingCompleted === true,
    });
    return Response.json(intent, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      { error: publicErrorMessage(error, "Upload denied.") },
      { status: 403 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      request,
      body,
      token: getServerEnv().BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await getAuth().api.getSession({
          headers: request.headers,
        });
        if (!session) throw new UserFacingError("Unauthorized");

        const intent = await authorizeUpload(pathname, clientPayload, {
          id: session.user.id,
          onboardingCompleted: session.user.onboardingCompleted === true,
        });
        return {
          allowedContentTypes: [intent.contentType],
          maximumSizeInBytes: uploadLimit(intent.kind),
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24 * 30,
          tokenPayload: clientPayload,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) {
          await deleteBlobsBestEffort(blob.pathname);
          throw new UserFacingError("Missing upload intent.");
        }
        await completeUpload(blob, verifyUploadIntent(tokenPayload));
      },
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: publicErrorMessage(error, "Upload failed.") },
      { status: 400 },
    );
  }
}
