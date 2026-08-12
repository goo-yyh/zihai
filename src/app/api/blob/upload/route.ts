import { del, head } from "@vercel/blob";
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { and, count, eq, max } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  iterationImages,
  projectImages,
  projectIterations,
  projects,
  user,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import {
  extensionForContentType,
  signUploadIntent,
  verifyUploadIntent,
  type UploadIntent,
} from "@/lib/upload-intent";
import {
  ALLOWED_IMAGE_TYPES,
  uploadKindSchema,
} from "@/lib/validations";

const issueIntentSchema = z.object({
  kind: uploadKindSchema,
  projectId: z.uuid().optional(),
  iterationId: z.uuid().optional(),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
});

function uploadLimits(kind: UploadIntent["kind"]) {
  return kind === "avatar" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
}

async function validateOwnership(intent: UploadIntent) {
  if (intent.kind === "avatar") return;

  if (intent.kind === "project-image") {
    if (!intent.projectId) throw new Error("Project is required.");
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, intent.projectId),
          eq(projects.ownerId, intent.userId),
        ),
      )
      .limit(1);
    if (!project) throw new Error("Project not found.");
    const [images] = await db
      .select({ value: count() })
      .from(projectImages)
      .where(eq(projectImages.projectId, intent.projectId));
    if ((images?.value ?? 0) >= 3) throw new Error("A project can have at most 3 images.");
    return;
  }

  if (!intent.iterationId || !intent.projectId) {
    throw new Error("Iteration and project are required.");
  }
  const [iteration] = await db
    .select({ id: projectIterations.id })
    .from(projectIterations)
    .where(
      and(
        eq(projectIterations.id, intent.iterationId),
        eq(projectIterations.projectId, intent.projectId),
        eq(projectIterations.ownerId, intent.userId),
      ),
    )
    .limit(1);
  if (!iteration) throw new Error("Iteration not found.");
  const [images] = await db
    .select({ value: count() })
    .from(iterationImages)
    .where(eq(iterationImages.iterationId, intent.iterationId));
  if ((images?.value ?? 0) >= 3) throw new Error("An iteration can have at most 3 images.");
}

function pathnameFor(intent: Omit<UploadIntent, "pathname" | "expiresAt">) {
  const filename = `${crypto.randomUUID()}.${extensionForContentType(intent.contentType)}`;
  if (intent.kind === "avatar") return `avatars/${intent.userId}/${filename}`;
  if (intent.kind === "project-image") {
    return `projects/${intent.userId}/${intent.projectId}/${filename}`;
  }
  return `iterations/${intent.userId}/${intent.projectId}/${intent.iterationId}/${filename}`;
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = issueIntentSchema.safeParse({
    kind: request.nextUrl.searchParams.get("kind"),
    projectId: request.nextUrl.searchParams.get("projectId") || undefined,
    iterationId: request.nextUrl.searchParams.get("iterationId") || undefined,
    contentType: request.nextUrl.searchParams.get("contentType"),
  });
  if (!parsed.success) {
    return Response.json({ error: "Invalid upload request." }, { status: 400 });
  }
  if (!session.user.onboardingCompleted && parsed.data.kind !== "avatar") {
    return Response.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const base = { ...parsed.data, userId: session.user.id };
  const intent: UploadIntent = {
    ...base,
    pathname: pathnameFor(base),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  try {
    await validateOwnership(intent);
    return Response.json(
      {
        pathname: intent.pathname,
        clientPayload: signUploadIntent(intent),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload denied." },
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
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) throw new Error("Unauthorized");
        if (!clientPayload) throw new Error("Upload intent is required.");

        const intent = verifyUploadIntent(clientPayload);
        if (!session.user.onboardingCompleted && intent.kind !== "avatar") {
          throw new Error("Complete onboarding first.");
        }
        if (intent.userId !== session.user.id || intent.pathname !== pathname) {
          throw new Error("Upload intent mismatch.");
        }
        await validateOwnership(intent);

        return {
          allowedContentTypes: [intent.contentType],
          maximumSizeInBytes: uploadLimits(intent.kind),
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24 * 30,
          tokenPayload: clientPayload,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) {
          await del(blob.pathname, { token: getServerEnv().BLOB_READ_WRITE_TOKEN });
          throw new Error("Missing upload intent.");
        }
        const intent = verifyUploadIntent(tokenPayload);
        if (intent.pathname !== blob.pathname) {
          await del(blob.pathname, { token: getServerEnv().BLOB_READ_WRITE_TOKEN });
          throw new Error("Upload pathname mismatch.");
        }

        try {
          const metadata = await head(blob.url, {
            token: getServerEnv().BLOB_READ_WRITE_TOKEN,
          });
          if (
            !ALLOWED_IMAGE_TYPES.includes(
              metadata.contentType as (typeof ALLOWED_IMAGE_TYPES)[number],
            ) ||
            metadata.contentType !== intent.contentType ||
            metadata.size > uploadLimits(intent.kind)
          ) {
            throw new Error("Uploaded file violates the image policy.");
          }

          if (intent.kind === "avatar") {
            const [existing] = await db
              .select({ pathname: user.avatarPathname })
              .from(user)
              .where(eq(user.id, intent.userId))
              .limit(1);
            if (!existing) throw new Error("User not found.");
            await db
              .update(user)
              .set({
                image: blob.url,
                avatarPathname: blob.pathname,
                updatedAt: new Date(),
              })
              .where(eq(user.id, intent.userId));
            if (existing.pathname && existing.pathname !== blob.pathname) {
              await del(existing.pathname, {
                token: getServerEnv().BLOB_READ_WRITE_TOKEN,
              });
            }
            revalidatePath("/onboarding");
            revalidatePath("/settings/profile");
            return;
          }

          await validateOwnership(intent);
          if (intent.kind === "project-image" && intent.projectId) {
            await db.transaction(async (tx) => {
              const [project] = await tx
                .select({ status: projects.status })
                .from(projects)
                .where(
                  and(
                    eq(projects.id, intent.projectId!),
                    eq(projects.ownerId, intent.userId),
                  ),
                )
                .for("update");
              if (!project) throw new Error("Project not found.");
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
              if (project.status === "approved") {
                await tx
                  .update(projects)
                  .set({
                    status: "pending",
                    submittedAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(projects.id, intent.projectId!));
              } else if (project.status === "rejected") {
                await tx
                  .update(projects)
                  .set({ status: "draft", rejectionReason: null, submittedAt: null, updatedAt: new Date() })
                  .where(eq(projects.id, intent.projectId!));
              } else if (project.status === "pending") {
                await tx
                  .update(projects)
                  .set({ submittedAt: new Date(), updatedAt: new Date() })
                  .where(eq(projects.id, intent.projectId!));
              } else {
                await tx
                  .update(projects)
                  .set({ updatedAt: new Date() })
                  .where(eq(projects.id, intent.projectId!));
              }
            });
            revalidatePath(`/dashboard/projects/${intent.projectId}/edit`);
            revalidatePath("/");
            return;
          }

          if (intent.iterationId && intent.projectId) {
            await db.transaction(async (tx) => {
              const [iteration] = await tx
                .select({ status: projectIterations.status })
                .from(projectIterations)
                .where(
                  and(
                    eq(projectIterations.id, intent.iterationId!),
                    eq(projectIterations.ownerId, intent.userId),
                  ),
                )
                .for("update");
              if (!iteration) throw new Error("Iteration not found.");
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
              if (iteration.status === "approved") {
                await tx
                  .update(projectIterations)
                  .set({ status: "pending", submittedAt: new Date(), updatedAt: new Date() })
                  .where(eq(projectIterations.id, intent.iterationId!));
              } else if (iteration.status === "rejected") {
                await tx
                  .update(projectIterations)
                  .set({ status: "draft", rejectionReason: null, submittedAt: null, updatedAt: new Date() })
                  .where(eq(projectIterations.id, intent.iterationId!));
              } else if (iteration.status === "pending") {
                await tx
                  .update(projectIterations)
                  .set({ submittedAt: new Date(), updatedAt: new Date() })
                  .where(eq(projectIterations.id, intent.iterationId!));
              } else {
                await tx
                  .update(projectIterations)
                  .set({ updatedAt: new Date() })
                  .where(eq(projectIterations.id, intent.iterationId!));
              }
            });
            revalidatePath(
              `/dashboard/projects/${intent.projectId}/iterations/${intent.iterationId}/edit`,
            );
          }
        } catch (error) {
          await del(blob.pathname, { token: getServerEnv().BLOB_READ_WRITE_TOKEN });
          throw error;
        }
      },
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
