import "server-only";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  account,
  iterationImages,
  moderationLogs,
  projectImages,
  projectIterations,
  projects,
  user,
} from "@/db/schema";

export async function getAdminStats() {
  const [users, allProjects, pendingProjects, approvedProjects, rejectedProjects, pendingIterations] =
    await Promise.all([
      db.select({ value: count() }).from(user),
      db.select({ value: count() }).from(projects),
      db
        .select({ value: count() })
        .from(projects)
        .where(eq(projects.status, "pending")),
      db
        .select({ value: count() })
        .from(projects)
        .where(eq(projects.status, "approved")),
      db
        .select({ value: count() })
        .from(projects)
        .where(eq(projects.status, "rejected")),
      db
        .select({ value: count() })
        .from(projectIterations)
        .where(eq(projectIterations.status, "pending")),
    ]);

  return {
    users: users[0]?.value ?? 0,
    projects: allProjects[0]?.value ?? 0,
    pendingProjects: pendingProjects[0]?.value ?? 0,
    approvedProjects: approvedProjects[0]?.value ?? 0,
    rejectedProjects: rejectedProjects[0]?.value ?? 0,
    pendingIterations: pendingIterations[0]?.value ?? 0,
  };
}

export async function getAdminProjects(status?: string) {
  const statusFilter = ["draft", "pending", "approved", "rejected", "archived"].includes(
    status ?? "",
  )
    ? (status as "draft" | "pending" | "approved" | "rejected" | "archived")
    : undefined;

  return db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      status: projects.status,
      submittedAt: projects.submittedAt,
      updatedAt: projects.updatedAt,
      ownerId: projects.ownerId,
      ownerEmail: user.email,
      ownerUsername: user.username,
    })
    .from(projects)
    .innerJoin(user, eq(projects.ownerId, user.id))
    .where(statusFilter ? eq(projects.status, statusFilter) : undefined)
    .orderBy(desc(projects.submittedAt), desc(projects.updatedAt));
}

export async function getAdminProject(projectId: string) {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      websiteUrl: projects.websiteUrl,
      githubUrl: projects.githubUrl,
      status: projects.status,
      rejectionReason: projects.rejectionReason,
      submittedAt: projects.submittedAt,
      approvedAt: projects.approvedAt,
      publishedAt: projects.publishedAt,
      ownerId: projects.ownerId,
      ownerEmail: user.email,
      ownerUsername: user.username,
      ownerImage: user.image,
    })
    .from(projects)
    .innerJoin(user, eq(projects.ownerId, user.id))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return null;

  const [images, logs] = await Promise.all([
    db
      .select()
      .from(projectImages)
      .where(eq(projectImages.projectId, projectId))
      .orderBy(projectImages.sortOrder),
    db
      .select()
      .from(moderationLogs)
      .where(
        and(
          eq(moderationLogs.targetType, "project"),
          eq(moderationLogs.targetId, projectId),
        ),
      )
      .orderBy(desc(moderationLogs.createdAt)),
  ]);

  return { ...project, images, logs };
}

export async function getAdminIterations(status?: string) {
  const statusFilter = ["draft", "pending", "approved", "rejected"].includes(
    status ?? "",
  )
    ? (status as "draft" | "pending" | "approved" | "rejected")
    : undefined;

  return db
    .select({
      id: projectIterations.id,
      projectId: projectIterations.projectId,
      projectName: projects.name,
      versionLabel: projectIterations.versionLabel,
      description: projectIterations.description,
      status: projectIterations.status,
      submittedAt: projectIterations.submittedAt,
      ownerUsername: user.username,
    })
    .from(projectIterations)
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .innerJoin(user, eq(projectIterations.ownerId, user.id))
    .where(statusFilter ? eq(projectIterations.status, statusFilter) : undefined)
    .orderBy(desc(projectIterations.submittedAt), desc(projectIterations.createdAt));
}

export async function getAdminIteration(iterationId: string) {
  const [iteration] = await db
    .select({
      id: projectIterations.id,
      projectId: projectIterations.projectId,
      projectName: projects.name,
      projectSlug: projects.slug,
      projectStatus: projects.status,
      versionLabel: projectIterations.versionLabel,
      description: projectIterations.description,
      status: projectIterations.status,
      rejectionReason: projectIterations.rejectionReason,
      submittedAt: projectIterations.submittedAt,
      approvedAt: projectIterations.approvedAt,
      ownerId: projectIterations.ownerId,
      ownerEmail: user.email,
      ownerUsername: user.username,
      ownerImage: user.image,
    })
    .from(projectIterations)
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .innerJoin(user, eq(projectIterations.ownerId, user.id))
    .where(eq(projectIterations.id, iterationId))
    .limit(1);

  if (!iteration) return null;

  const [images, logs] = await Promise.all([
    db
      .select()
      .from(iterationImages)
      .where(eq(iterationImages.iterationId, iterationId))
      .orderBy(iterationImages.sortOrder),
    db
      .select()
      .from(moderationLogs)
      .where(
        and(
          eq(moderationLogs.targetType, "iteration"),
          eq(moderationLogs.targetId, iterationId),
        ),
      )
      .orderBy(desc(moderationLogs.createdAt)),
  ]);

  return { ...iteration, images, logs };
}

export async function getAdminUsers(search?: string) {
  const filter = search?.trim()
    ? or(
        ilike(user.email, `%${search.trim()}%`),
        ilike(user.username, `%${search.trim()}%`),
      )
    : undefined;

  return db
    .select({
      id: user.id,
      email: user.email,
      username: user.username,
      image: user.image,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      createdAt: user.createdAt,
      projectCount: sql<number>`count(distinct ${projects.id})::int`,
      providers: sql<string>`coalesce(string_agg(distinct ${account.providerId}, ', '), '')`,
    })
    .from(user)
    .leftJoin(projects, eq(projects.ownerId, user.id))
    .leftJoin(account, eq(account.userId, user.id))
    .where(filter)
    .groupBy(user.id)
    .orderBy(desc(user.createdAt));
}

export async function getAdminUser(userId: string) {
  const [profile] = await db
    .select({
      id: user.id,
      email: user.email,
      username: user.username,
      image: user.image,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      providers: sql<string>`coalesce(string_agg(distinct ${account.providerId}, ', '), '')`,
    })
    .from(user)
    .leftJoin(account, eq(account.userId, user.id))
    .where(eq(user.id, userId))
    .groupBy(user.id)
    .limit(1);

  if (!profile) return null;

  const ownedProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      status: projects.status,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .orderBy(desc(projects.updatedAt));

  return { ...profile, projects: ownedProjects };
}

export async function getAuditLogs() {
  return db
    .select({
      id: moderationLogs.id,
      action: moderationLogs.action,
      targetType: moderationLogs.targetType,
      targetId: moderationLogs.targetId,
      reason: moderationLogs.reason,
      metadata: moderationLogs.metadata,
      createdAt: moderationLogs.createdAt,
      adminEmail: user.email,
      adminUsername: user.username,
    })
    .from(moderationLogs)
    .leftJoin(user, eq(moderationLogs.adminId, user.id))
    .orderBy(desc(moderationLogs.createdAt))
    .limit(500);
}
