"use server";

import "server-only";

import { and, count, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb, withTransaction } from "@/db";
import { getImagePathnamesForProject } from "@/db/queries/dashboard";
import { projectImages, projects } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import {
  assertImageCount,
  assertSubmittable,
  contentEditPatch,
} from "@/lib/content-lifecycle";
import { UserFacingError } from "@/lib/errors";
import { assertCanCreateProject } from "@/lib/project-limits";
import { assertOnboardedUser } from "@/lib/session";
import { insertWithUniqueSlug } from "@/lib/slug";
import { projectInputSchema } from "@/lib/validations";
import { deleteBlobs } from "@/server/blob";
import {
  revalidateProjectWorkspace,
  revalidatePublicProject,
} from "@/server/cache";
import type { ActionState } from "@/types/actions";

const idSchema = z.uuid();

type ProjectCreateTiming = {
  outcome: "success" | "validation_error" | "insert_error";
  sessionMs: number;
  slugResolutionMs: number;
  insertDbMs: number;
  insertAttempts: number;
  totalMs: number;
};

function logProjectCreateTiming(timing: ProjectCreateTiming) {
  console.info(JSON.stringify({ event: "project.create.timing", ...timing }));
}

function projectInput(formData: FormData) {
  return projectInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    websiteUrl: formData.get("websiteUrl"),
    githubUrl: formData.get("githubUrl"),
  });
}

export async function createProjectAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const totalStartedAt = Date.now();
  const sessionStartedAt = Date.now();
  const session = await assertOnboardedUser();
  const sessionMs = Date.now() - sessionStartedAt;
  const parsed = projectInput(formData);
  if (!parsed.success) {
    logProjectCreateTiming({
      outcome: "validation_error",
      sessionMs,
      slugResolutionMs: 0,
      insertDbMs: 0,
      insertAttempts: 0,
      totalMs: Date.now() - totalStartedAt,
    });
    return validationError(parsed.error);
  }

  let projectId: string;
  let insertDbMs = 0;
  let insertAttempts = 0;
  const slugResolutionStartedAt = Date.now();
  try {
    const result = await withTransaction(async (tx) => {
      // A per-owner transaction lock serializes count-and-insert so concurrent
      // requests cannot both observe the ninth project and create an eleventh.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`project-owner:${session.user.id}`}, 0))`,
      );
      const [ownedProjects] = await tx
        .select({ value: count() })
        .from(projects)
        .where(eq(projects.ownerId, session.user.id));
      assertCanCreateProject(ownedProjects?.value ?? 0);

      return insertWithUniqueSlug(parsed.data.name, async (slug) => {
        insertAttempts += 1;
        const insertStartedAt = Date.now();
        try {
          const [project] = await tx
            .insert(projects)
            .values({
              ownerId: session.user.id,
              slug,
              ...parsed.data,
            })
            .onConflictDoNothing({ target: projects.slug })
            .returning({ id: projects.id });
          return project;
        } finally {
          insertDbMs += Date.now() - insertStartedAt;
        }
      });
    });
    projectId = result.inserted.id;
  } catch (error) {
    logProjectCreateTiming({
      outcome: "insert_error",
      sessionMs,
      slugResolutionMs: Date.now() - slugResolutionStartedAt,
      insertDbMs,
      insertAttempts,
      totalMs: Date.now() - totalStartedAt,
    });
    return safeActionError(error, "Unable to create the project.");
  }

  logProjectCreateTiming({
    outcome: "success",
    sessionMs,
    slugResolutionMs: Date.now() - slugResolutionStartedAt,
    insertDbMs,
    insertAttempts,
    totalMs: Date.now() - totalStartedAt,
  });

  redirect(`/dashboard/projects/${projectId}/edit`);
}

export async function updateProjectAction(
  projectId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertOnboardedUser();
  const parsedId = idSchema.safeParse(projectId);
  if (!parsedId.success) {
    return { status: "error", message: "Invalid project." };
  }

  const parsed = projectInput(formData);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const existing = await withTransaction(async (tx) => {
      const [ownedProject] = await tx
        .select({ status: projects.status, slug: projects.slug })
        .from(projects)
        .where(
          and(
            eq(projects.id, parsedId.data),
            eq(projects.ownerId, session.user.id),
          ),
        )
        .for("update");
      if (!ownedProject) throw new UserFacingError("Project not found.");

      await tx
        .update(projects)
        .set({
          ...parsed.data,
          ...contentEditPatch(ownedProject.status),
          publishedAt: null,
        })
        .where(
          and(
            eq(projects.id, parsedId.data),
            eq(projects.ownerId, session.user.id),
          ),
        );

      return ownedProject;
    });

    revalidateProjectWorkspace(parsedId.data);
    revalidatePublicProject(existing.slug, session.user.username);

    return {
      status: "success",
      message:
        existing.status === "approved"
          ? "Changes saved and submitted for review. The public page is hidden until approval."
          : "Project saved.",
    };
  } catch (error) {
    return safeActionError(error, "Unable to save the project.");
  }
}

export async function submitProjectAction(projectId: string) {
  const session = await assertOnboardedUser();
  const id = idSchema.parse(projectId);

  await withTransaction(async (tx) => {
    // Upload callbacks lock the same project row, so the image-count check and
    // submission transition observe one serialized state.
    const [project] = await tx
      .select({ status: projects.status })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)))
      .for("update");
    if (!project) throw new UserFacingError("Project not found.");
    assertSubmittable(project.status, "project");

    const [images] = await tx
      .select({ value: count() })
      .from(projectImages)
      .where(eq(projectImages.projectId, id));
    assertImageCount(images?.value ?? 0, "Project");

    const now = new Date();
    await tx
      .update(projects)
      .set({
        status: "pending",
        rejectionReason: null,
        submittedAt: now,
        updatedAt: now,
      })
      .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));
  });

  revalidateProjectWorkspace(id);
  redirect("/dashboard?submitted=project");
}

export async function deleteProjectAction(projectId: string) {
  const session = await assertOnboardedUser();
  const id = idSchema.parse(projectId);

  const [project] = await getDb()
    .select({ slug: projects.slug })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)))
    .limit(1);
  if (!project) throw new UserFacingError("Project not found.");

  await deleteBlobs(await getImagePathnamesForProject(id));
  await getDb()
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)));

  revalidateProjectWorkspace(id);
  revalidatePublicProject(project.slug, session.user.username);
  redirect("/dashboard?deleted=project");
}
