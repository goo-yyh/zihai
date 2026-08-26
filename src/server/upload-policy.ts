import "server-only";

import { and, count, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { projectImages, projects } from "@/db/schema";
import { MAX_CONTENT_IMAGES } from "@/lib/content-lifecycle";
import { UserFacingError } from "@/lib/errors";
import {
  extensionForContentType,
  signUploadIntent,
  verifyUploadIntent,
  type UploadIntent,
} from "@/lib/upload-intent";

const UPLOAD_INTENT_TTL_MS = 10 * 60 * 1000;

type UploadUser = {
  id: string;
  onboardingCompleted: boolean;
};

type UploadRequest = {
  kind: UploadIntent["kind"];
  projectId?: string;
  contentType: UploadIntent["contentType"];
};

function pathnameFor(request: UploadRequest & { userId: string }) {
  const filename = `${crypto.randomUUID()}.${extensionForContentType(request.contentType)}`;

  if (request.kind === "avatar") {
    return `avatars/${request.userId}/${filename}`;
  }
  if (request.kind === "project-image") {
    return `projects/${request.userId}/${request.projectId}/${filename}`;
  }
  throw new UserFacingError("Unsupported upload kind.");
}

export async function validateUploadOwnership(intent: UploadIntent) {
  if (intent.kind === "avatar") return;

  if (intent.kind === "project-image") {
    if (!intent.projectId) throw new UserFacingError("Project is required.");

    const [project] = await getDb()
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, intent.projectId),
          eq(projects.ownerId, intent.userId),
        ),
      )
      .limit(1);
    if (!project) throw new UserFacingError("Project not found.");

    const [existingImage] = await getDb()
      .select({ id: projectImages.id })
      .from(projectImages)
      .where(
        and(
          eq(projectImages.projectId, intent.projectId),
          eq(projectImages.blobPathname, intent.pathname),
        ),
      )
      .limit(1);
    if (existingImage) return;

    const [images] = await getDb()
      .select({ value: count() })
      .from(projectImages)
      .where(eq(projectImages.projectId, intent.projectId));
    if ((images?.value ?? 0) >= MAX_CONTENT_IMAGES) {
      throw new UserFacingError(
        `A project can have at most ${MAX_CONTENT_IMAGES} images.`,
      );
    }
    return;
  }
}

export async function issueUploadIntent(
  request: UploadRequest,
  uploadUser: UploadUser,
) {
  if (!uploadUser.onboardingCompleted && request.kind !== "avatar") {
    throw new UserFacingError("Complete onboarding first.");
  }

  const intent: UploadIntent = {
    ...request,
    userId: uploadUser.id,
    pathname: pathnameFor({ ...request, userId: uploadUser.id }),
    expiresAt: Date.now() + UPLOAD_INTENT_TTL_MS,
  };
  await validateUploadOwnership(intent);

  return {
    pathname: intent.pathname,
    clientPayload: signUploadIntent(intent),
  };
}

export async function authorizeUpload(
  pathname: string,
  clientPayload: string | null | undefined,
  uploadUser: UploadUser,
) {
  if (!clientPayload) {
    throw new UserFacingError("Upload intent is required.");
  }

  const intent = verifyUploadIntent(clientPayload);
  if (!uploadUser.onboardingCompleted && intent.kind !== "avatar") {
    throw new UserFacingError("Complete onboarding first.");
  }
  if (intent.userId !== uploadUser.id || intent.pathname !== pathname) {
    throw new UserFacingError("Upload intent mismatch.");
  }

  await validateUploadOwnership(intent);
  return intent;
}
