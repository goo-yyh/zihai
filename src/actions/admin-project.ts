"use server";

import "server-only";

import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb, withTransaction } from "@/db";
import { moderationLogs, projectImages, projects, user } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import { assertImageCount } from "@/lib/content-lifecycle";
import { UserFacingError } from "@/lib/errors";
import { assertAdmin } from "@/lib/session";
import { rejectionSchema } from "@/lib/validations";
import {
  revalidateAdminProjects,
  revalidatePublicProject,
} from "@/server/cache";
import { scheduleNotification } from "@/server/notifications";
import type { ActionState } from "@/types/actions";

const idSchema = z.uuid();

async function ownerProfile(ownerId: string) {
  const [owner] = await getDb()
    .select({ username: user.username })
    .from(user)
    .where(eq(user.id, ownerId))
    .limit(1);
  return { id: ownerId, username: owner?.username ?? null };
}

export async function approveProjectAction(projectId: string) {
  const session = await assertAdmin();
  const id = idSchema.parse(projectId);

  const project = await withTransaction(async (tx) => {
    const [pendingProject] = await tx
      .select({
        status: projects.status,
        name: projects.name,
        slug: projects.slug,
        ownerId: projects.ownerId,
      })
      .from(projects)
      .where(eq(projects.id, id))
      .for("update");
    if (!pendingProject) throw new UserFacingError("Project not found.");
    if (pendingProject.status !== "pending") {
      throw new UserFacingError("Only pending content can be reviewed.");
    }

    const [images] = await tx
      .select({ value: count() })
      .from(projectImages)
      .where(eq(projectImages.projectId, id));
    assertImageCount(images?.value ?? 0);

    const now = new Date();
    await tx
      .update(projects)
      .set({
        status: "approved",
        rejectionReason: null,
        approvedAt: now,
        approvedBy: session.user.id,
        publishedAt: now,
        updatedAt: now,
      })
      .where(and(eq(projects.id, id), eq(projects.status, "pending")));
    await tx.insert(moderationLogs).values({
      adminId: session.user.id,
      targetType: "project",
      targetId: id,
      action: "approve_project",
    });
    return pendingProject;
  });

  scheduleNotification({
    recipientId: project.ownerId,
    actorId: session.user.id,
    type: "project_approved",
    projectId: id,
    payload: { projectName: project.name },
  });
  revalidatePublicProject(
    { id, slug: project.slug },
    await ownerProfile(project.ownerId),
  );
  revalidateAdminProjects();
  redirect(`/admin/projects/${id}?approved=1`);
}

export async function rejectProjectAction(
  projectId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertAdmin();
  const id = idSchema.parse(projectId);
  const parsed = rejectionSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const project = await withTransaction(async (tx) => {
      const [pendingProject] = await tx
        .select({
          status: projects.status,
          name: projects.name,
          slug: projects.slug,
          ownerId: projects.ownerId,
        })
        .from(projects)
        .where(eq(projects.id, id))
        .for("update");
      if (!pendingProject) throw new UserFacingError("Project not found.");
      if (pendingProject.status !== "pending") {
        throw new UserFacingError("Only pending content can be reviewed.");
      }

      await tx
        .update(projects)
        .set({
          status: "rejected",
          rejectionReason: parsed.data.reason,
          approvedAt: null,
          approvedBy: null,
          publishedAt: null,
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, id), eq(projects.status, "pending")));
      await tx.insert(moderationLogs).values({
        adminId: session.user.id,
        targetType: "project",
        targetId: id,
        action: "reject_project",
        reason: parsed.data.reason,
      });
      return pendingProject;
    });

    scheduleNotification({
      recipientId: project.ownerId,
      actorId: session.user.id,
      type: "project_rejected",
      projectId: id,
      payload: {
        projectName: project.name,
        rejectionReason: parsed.data.reason,
      },
    });
    revalidatePublicProject(
      { id, slug: project.slug },
      await ownerProfile(project.ownerId),
    );
    revalidateAdminProjects();
    return { status: "success", message: "Project rejected." };
  } catch (error) {
    return safeActionError(error, "Unable to reject the project.");
  }
}

export async function archiveProjectAction(projectId: string) {
  const session = await assertAdmin();
  const id = idSchema.parse(projectId);

  const project = await withTransaction(async (tx) => {
    const [approvedProject] = await tx
      .select({
        status: projects.status,
        name: projects.name,
        slug: projects.slug,
        ownerId: projects.ownerId,
      })
      .from(projects)
      .where(eq(projects.id, id))
      .for("update");
    if (!approvedProject) throw new UserFacingError("Project not found.");
    if (approvedProject.status !== "approved") {
      throw new UserFacingError("Only approved projects can be archived.");
    }

    await tx
      .update(projects)
      .set({
        status: "archived",
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.status, "approved")));
    await tx.insert(moderationLogs).values({
      adminId: session.user.id,
      targetType: "project",
      targetId: id,
      action: "archive_project",
    });
    return approvedProject;
  });

  scheduleNotification({
    recipientId: project.ownerId,
    actorId: session.user.id,
    type: "project_archived",
    projectId: id,
    payload: { projectName: project.name },
  });
  revalidatePublicProject(
    { id, slug: project.slug },
    await ownerProfile(project.ownerId),
  );
  revalidateAdminProjects();
  redirect(`/admin/projects/${id}?archived=1`);
}

export async function republishProjectAction(projectId: string) {
  const session = await assertAdmin();
  const id = idSchema.parse(projectId);

  const project = await withTransaction(async (tx) => {
    const [archivedProject] = await tx
      .select({
        status: projects.status,
        name: projects.name,
        slug: projects.slug,
        ownerId: projects.ownerId,
      })
      .from(projects)
      .where(eq(projects.id, id))
      .for("update");
    if (!archivedProject) throw new UserFacingError("Project not found.");
    if (archivedProject.status !== "archived") {
      throw new UserFacingError("Only archived projects can be republished.");
    }

    const [images] = await tx
      .select({ value: count() })
      .from(projectImages)
      .where(eq(projectImages.projectId, id));
    assertImageCount(images?.value ?? 0);

    const now = new Date();
    await tx
      .update(projects)
      .set({
        status: "approved",
        publishedAt: now,
        updatedAt: now,
      })
      .where(and(eq(projects.id, id), eq(projects.status, "archived")));
    await tx.insert(moderationLogs).values({
      adminId: session.user.id,
      targetType: "project",
      targetId: id,
      action: "republish_project",
    });
    return archivedProject;
  });

  scheduleNotification({
    recipientId: project.ownerId,
    actorId: session.user.id,
    type: "project_republished",
    projectId: id,
    payload: { projectName: project.name },
  });
  revalidatePublicProject(
    { id, slug: project.slug },
    await ownerProfile(project.ownerId),
  );
  revalidateAdminProjects();
  redirect(`/admin/projects/${id}?republished=1`);
}
