"use server";

import "server-only";

import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { getImagePathnamesForProject } from "@/db/queries/dashboard";
import { projectImages, projects } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import {
  assertImageCount,
  assertSubmittable,
  contentEditPatch,
} from "@/lib/content-lifecycle";
import { UserFacingError } from "@/lib/errors";
import { assertOnboardedUser } from "@/lib/session";
import { slugify, withSlugSuffix } from "@/lib/slug";
import { projectInputSchema } from "@/lib/validations";
import { deleteBlobs } from "@/server/blob";
import {
  revalidateProjectWorkspace,
  revalidatePublicProject,
} from "@/server/cache";
import type { ActionState } from "@/types/actions";

const idSchema = z.uuid();

async function createUniqueSlug(name: string) {
  const base = slugify(name);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const slug = withSlugSuffix(base, attempt);
    const [existing] = await getDb()
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    if (!existing) return slug;
  }

  return `${base || "project"}-${crypto.randomUUID().slice(0, 8)}`;
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
  const session = await assertOnboardedUser();
  const parsed = projectInput(formData);
  if (!parsed.success) return validationError(parsed.error);

  let projectId: string;
  try {
    const [project] = await getDb()
      .insert(projects)
      .values({
        ownerId: session.user.id,
        slug: await createUniqueSlug(parsed.data.name),
        ...parsed.data,
      })
      .returning({ id: projects.id });
    if (!project) throw new Error("Insert returned no project.");
    projectId = project.id;
  } catch (error) {
    return safeActionError(error, "Unable to create the project.");
  }

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
    const existing = await getDb().transaction(async (tx) => {
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

  await getDb().transaction(async (tx) => {
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
