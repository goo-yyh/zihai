"use server";

import "server-only";

import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  iterationImages,
  moderationLogs,
  projectImages,
  projectIterations,
  projects,
  user,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { assertAdmin } from "@/lib/session";
import { rejectionSchema } from "@/lib/validations";
import type { ActionState } from "@/types/actions";
import { validationError } from "@/lib/action-utils";

const idSchema = z.string().min(1);

export async function approveProjectAction(projectId: string) {
  const current = await assertAdmin();
  const id = z.uuid().parse(projectId);

  const [project] = await db
    .select({ id: projects.id, status: projects.status, slug: projects.slug, ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!project) throw new Error("Not found");
  if (project.status !== "pending") throw new Error("Only pending content can be reviewed.");

  const now = new Date();
  await db.transaction(async (tx) => {
    const [lockedProject] = await tx
      .select({ status: projects.status })
      .from(projects)
      .where(eq(projects.id, id))
      .for("update");
    if (lockedProject?.status !== "pending") {
      throw new Error("This project has already been reviewed.");
    }
    const [images] = await tx
      .select({ value: count() })
      .from(projectImages)
      .where(eq(projectImages.projectId, id));
    if (!images || images.value < 1 || images.value > 3) {
      throw new Error("Project must have between 1 and 3 images.");
    }
    const [updated] = await tx
      .update(projects)
      .set({
        status: "approved",
        rejectionReason: null,
        approvedAt: now,
        approvedBy: current.user.id,
        publishedAt: now,
        updatedAt: now,
      })
      .where(and(eq(projects.id, id), eq(projects.status, "pending")))
      .returning({ id: projects.id });
    if (!updated) throw new Error("This project has already been reviewed.");
    await tx.insert(moderationLogs).values({
      adminId: current.user.id,
      targetType: "project",
      targetId: id,
      action: "approve_project",
    });
  });

  const [owner] = await db
    .select({ username: user.username })
    .from(user)
    .where(eq(user.id, project.ownerId))
    .limit(1);
  revalidatePath("/");
  revalidatePath(`/p/${project.slug}`);
  if (owner?.username) revalidatePath(`/u/${owner.username}`);
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
  redirect(`/admin/projects/${id}?approved=1`);
}

export async function rejectProjectAction(
  projectId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await assertAdmin();
  const id = z.uuid().parse(projectId);
  const parsed = rejectionSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return validationError(parsed.error);

  const [project] = await db
    .select({ status: projects.status, slug: projects.slug, ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!project) return { status: "error", message: "Not found" };
  if (project.status !== "pending") {
    return { status: "error", message: "Only pending content can be reviewed." };
  }

  const changed = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(projects)
      .set({
        status: "rejected",
        rejectionReason: parsed.data.reason,
        approvedAt: null,
        approvedBy: null,
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.status, "pending")))
      .returning({ id: projects.id });
    if (!updated) return false;
    await tx.insert(moderationLogs).values({
      adminId: current.user.id,
      targetType: "project",
      targetId: id,
      action: "reject_project",
      reason: parsed.data.reason,
    });
    return true;
  });
  if (!changed) return { status: "error", message: "This project has already been reviewed." };

  const [owner] = await db
    .select({ username: user.username })
    .from(user)
    .where(eq(user.id, project.ownerId))
    .limit(1);
  revalidatePath("/");
  revalidatePath(`/p/${project.slug}`);
  if (owner?.username) revalidatePath(`/u/${owner.username}`);
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
  return { status: "success", message: "Project rejected." };
}

export async function approveIterationAction(iterationId: string) {
  const current = await assertAdmin();
  const id = z.uuid().parse(iterationId);
  const [iteration] = await db
    .select({
      status: projectIterations.status,
      projectId: projectIterations.projectId,
      projectSlug: projects.slug,
    })
    .from(projectIterations)
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .where(eq(projectIterations.id, id))
    .limit(1);
  if (!iteration) throw new Error("Not found");
  if (iteration.status !== "pending") throw new Error("Only pending content can be reviewed.");

  await db.transaction(async (tx) => {
    const [lockedIteration] = await tx
      .select({ status: projectIterations.status })
      .from(projectIterations)
      .where(eq(projectIterations.id, id))
      .for("update");
    if (lockedIteration?.status !== "pending") {
      throw new Error("This iteration has already been reviewed.");
    }
    const [images] = await tx
      .select({ value: count() })
      .from(iterationImages)
      .where(eq(iterationImages.iterationId, id));
    if (!images || images.value < 1 || images.value > 3) {
      throw new Error("Iteration must have between 1 and 3 images.");
    }
    const [updated] = await tx
      .update(projectIterations)
      .set({
        status: "approved",
        rejectionReason: null,
        approvedAt: new Date(),
        approvedBy: current.user.id,
        updatedAt: new Date(),
      })
      .where(and(eq(projectIterations.id, id), eq(projectIterations.status, "pending")))
      .returning({ id: projectIterations.id });
    if (!updated) throw new Error("This iteration has already been reviewed.");
    await tx.insert(moderationLogs).values({
      adminId: current.user.id,
      targetType: "iteration",
      targetId: id,
      action: "approve_iteration",
      metadata: { projectId: iteration.projectId },
    });
  });
  revalidatePath(`/p/${iteration.projectSlug}`);
  revalidatePath("/admin/iterations");
  revalidatePath("/admin");
  redirect("/admin/iterations?approved=1");
}

export async function rejectIterationAction(
  iterationId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await assertAdmin();
  const id = z.uuid().parse(iterationId);
  const parsed = rejectionSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return validationError(parsed.error);
  const [iteration] = await db
    .select({
      status: projectIterations.status,
      projectId: projectIterations.projectId,
      projectSlug: projects.slug,
    })
    .from(projectIterations)
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .where(eq(projectIterations.id, id))
    .limit(1);
  if (!iteration) return { status: "error", message: "Not found" };
  if (iteration.status !== "pending") {
    return { status: "error", message: "Only pending content can be reviewed." };
  }

  const changed = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(projectIterations)
      .set({
        status: "rejected",
        rejectionReason: parsed.data.reason,
        approvedAt: null,
        approvedBy: null,
        updatedAt: new Date(),
      })
      .where(and(eq(projectIterations.id, id), eq(projectIterations.status, "pending")))
      .returning({ id: projectIterations.id });
    if (!updated) return false;
    await tx.insert(moderationLogs).values({
      adminId: current.user.id,
      targetType: "iteration",
      targetId: id,
      action: "reject_iteration",
      reason: parsed.data.reason,
      metadata: { projectId: iteration.projectId },
    });
    return true;
  });
  if (!changed) return { status: "error", message: "This iteration has already been reviewed." };
  revalidatePath(`/p/${iteration.projectSlug}`);
  revalidatePath("/admin/iterations");
  revalidatePath("/admin");
  return { status: "success", message: "Iteration rejected." };
}

export async function setUserRoleAction(userId: string, role: "user" | "admin") {
  const current = await assertAdmin();
  const targetId = idSchema.parse(userId);
  z.enum(["user", "admin"]).parse(role);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(948217431)`);
    const [target] = await tx
      .select({ role: user.role, email: user.email })
      .from(user)
      .where(eq(user.id, targetId))
      .limit(1);
    if (!target) throw new Error("Not found");

    if (target.role === "admin" && role === "user") {
      const [admins] = await tx
        .select({ value: count() })
        .from(user)
        .where(eq(user.role, "admin"));
      if ((admins?.value ?? 0) <= 1) {
        throw new Error("At least one administrator is required.");
      }
    }

    await tx
      .update(user)
      .set({ role, updatedAt: new Date() })
      .where(eq(user.id, targetId));
    await tx.insert(moderationLogs).values({
      adminId: current.user.id,
      targetType: "user",
      targetId,
      action: role === "admin" ? "promote_admin" : "revoke_admin",
      metadata: { email: target.email },
    });
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
}

export async function setUserBanAction(
  userId: string,
  banned: boolean,
  reason?: string,
) {
  const current = await assertAdmin();
  const targetId = idSchema.parse(userId);
  if (targetId === current.user.id && banned) {
    throw new Error("You cannot ban your own account.");
  }
  const normalizedReason = banned
    ? z.string().trim().min(3).max(500).parse(reason)
    : undefined;

  if (banned) {
    await auth.api.banUser({
      headers: await headers(),
      body: { userId: targetId, banReason: normalizedReason },
    });
  } else {
    await auth.api.unbanUser({
      headers: await headers(),
      body: { userId: targetId },
    });
  }
  await db.insert(moderationLogs).values({
    adminId: current.user.id,
    targetType: "user",
    targetId,
    action: banned ? "ban_user" : "unban_user",
    reason: normalizedReason,
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
}
