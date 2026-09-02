import type { NextRequest } from "next/server";

import { getAuth } from "@/lib/auth";
import { publicErrorMessage, UserFacingError } from "@/lib/errors";
import { verifyUploadIntent } from "@/lib/upload-intent";
import { uploadCompletionSchema } from "@/lib/validations";
import { completeUpload } from "@/server/upload-completion";

export async function POST(request: NextRequest) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = uploadCompletionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid upload completion." },
      { status: 400 },
    );
  }

  try {
    const intent = verifyUploadIntent(parsed.data.clientPayload);
    if (intent.userId !== session.user.id) {
      throw new UserFacingError("Upload intent mismatch.");
    }

    const persisted = await completeUpload(parsed.data.blob, intent);
    return Response.json(
      {
        persisted: true,
        ...(persisted.kind === "project-qr-code"
          ? { qrCodeUrl: persisted.qrCodeUrl }
          : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: publicErrorMessage(error, "Upload completion failed.") },
      { status: 400 },
    );
  }
}
