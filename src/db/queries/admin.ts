import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
  sql,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  createTimestampCursorPage,
  exactTimestamp,
  timestampCursorCondition,
} from "@/db/queries/cursor-pagination";
import {
  account,
  feedback,
  ideas,
  moderationLogs,
  projectImages,
  PROJECT_STATUSES,
  projects,
  user,
} from "@/db/schema";
import { IDEA_STATUSES } from "@/lib/idea-lifecycle";
import {
  decodePageCursor,
  DEFAULT_ADMIN_PAGE_SIZE,
  normalizePageSize,
  type CursorIdKind,
} from "@/lib/pagination";

type AdminPageOptions = {
  cursor?: string;
  pageSize?: number;
};

type AuditLogFilters = {
  search?: string;
  targetType?: "project" | "idea" | "user";
};

function paginationOptions(options: AdminPageOptions, idKind: CursorIdKind) {
  return {
    cursor: decodePageCursor(options.cursor, idKind),
    pageSize: normalizePageSize(options.pageSize ?? DEFAULT_ADMIN_PAGE_SIZE),
  };
}

function moderationLogPageQuery(
  targetType: "project" | "idea",
  targetId: string,
  options: AdminPageOptions,
) {
  const { cursor, pageSize } = paginationOptions(options, "uuid");
  const previous = cursor?.direction === "previous";
  const query = getDb()
    .select({
      ...getTableColumns(moderationLogs),
      cursorSortValue: exactTimestamp(moderationLogs.createdAt),
    })
    .from(moderationLogs)
    .where(
      and(
        eq(moderationLogs.targetType, targetType),
        eq(moderationLogs.targetId, targetId),
        timestampCursorCondition(
          moderationLogs.createdAt,
          moderationLogs.id,
          cursor,
        ),
      ),
    )
    .orderBy(
      previous ? asc(moderationLogs.createdAt) : desc(moderationLogs.createdAt),
      previous ? asc(moderationLogs.id) : desc(moderationLogs.id),
    )
    .limit(pageSize + 1);

  return { query, cursor, pageSize };
}

export async function getAdminStats() {
  const [stats] = await getDb()
    .select({
      users: sql<number>`(select count(*)::int from ${user})`,
      projects: sql<number>`count(*)::int`,
      pendingProjects: sql<number>`count(*) filter (where ${projects.status} = 'pending')::int`,
      approvedProjects: sql<number>`count(*) filter (where ${projects.status} = 'approved')::int`,
      rejectedProjects: sql<number>`count(*) filter (where ${projects.status} = 'rejected')::int`,
      feedback: sql<number>`(select count(*)::int from ${feedback})`,
      ideas: sql<number>`(select count(*)::int from ${ideas})`,
      pendingIdeas: sql<number>`(
        select count(*)::int from ${ideas} where ${ideas.status} = 'pending'
      )`,
    })
    .from(projects);

  return {
    users: stats?.users ?? 0,
    projects: stats?.projects ?? 0,
    pendingProjects: stats?.pendingProjects ?? 0,
    approvedProjects: stats?.approvedProjects ?? 0,
    rejectedProjects: stats?.rejectedProjects ?? 0,
    feedback: stats?.feedback ?? 0,
    ideas: stats?.ideas ?? 0,
    pendingIdeas: stats?.pendingIdeas ?? 0,
  };
}

export async function getAdminIdeas(
  status?: string,
  options: AdminPageOptions = {},
) {
  const statusFilter = IDEA_STATUSES.find((value) => value === status);
  const { cursor, pageSize } = paginationOptions(options, "uuid");
  const previous = cursor?.direction === "previous";

  const rows = await getDb()
    .select({
      id: ideas.id,
      title: ideas.title,
      status: ideas.status,
      createdAt: ideas.createdAt,
      updatedAt: ideas.updatedAt,
      userId: ideas.userId,
      userEmail: sql<string>`coalesce(${user.contactEmail}, ${user.email})`,
      userUsername: user.username,
      cursorSortValue: exactTimestamp(ideas.updatedAt),
    })
    .from(ideas)
    .innerJoin(user, eq(ideas.userId, user.id))
    .where(
      and(
        statusFilter ? eq(ideas.status, statusFilter) : undefined,
        timestampCursorCondition(ideas.updatedAt, ideas.id, cursor),
      ),
    )
    .orderBy(
      previous ? asc(ideas.updatedAt) : desc(ideas.updatedAt),
      previous ? asc(ideas.id) : desc(ideas.id),
    )
    .limit(pageSize + 1);

  return createTimestampCursorPage(rows, pageSize, cursor);
}

export async function getAdminIdea(
  ideaId: string,
  options: AdminPageOptions = {},
) {
  const ideaQuery = getDb()
    .select({
      id: ideas.id,
      title: ideas.title,
      description: ideas.description,
      status: ideas.status,
      rejectionReason: ideas.rejectionReason,
      resultUrl: ideas.resultUrl,
      githubUrl: ideas.githubUrl,
      reviewedAt: ideas.reviewedAt,
      completedAt: ideas.completedAt,
      createdAt: ideas.createdAt,
      updatedAt: ideas.updatedAt,
      userId: ideas.userId,
      userEmail: sql<string>`coalesce(${user.contactEmail}, ${user.email})`,
      userUsername: user.username,
      userImage: user.image,
    })
    .from(ideas)
    .innerJoin(user, eq(ideas.userId, user.id))
    .where(eq(ideas.id, ideaId))
    .limit(1);
  const logs = moderationLogPageQuery("idea", ideaId, options);
  const [ideaRows, logRows] = await getDb().batch([ideaQuery, logs.query]);
  const idea = ideaRows[0];
  if (!idea) return null;

  return {
    ...idea,
    logs: createTimestampCursorPage(logRows, logs.pageSize, logs.cursor),
  };
}

export async function getAdminProjects(
  status?: string,
  options: AdminPageOptions = {},
) {
  const statusFilter = PROJECT_STATUSES.find((value) => value === status);
  const { cursor, pageSize } = paginationOptions(options, "uuid");
  const previous = cursor?.direction === "previous";

  const rows = await getDb()
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      status: projects.status,
      submittedAt: projects.submittedAt,
      updatedAt: projects.updatedAt,
      ownerId: projects.ownerId,
      ownerEmail: sql<string>`coalesce(${user.contactEmail}, ${user.email})`,
      ownerUsername: user.username,
      cursorSortValue: exactTimestamp(projects.updatedAt),
    })
    .from(projects)
    .innerJoin(user, eq(projects.ownerId, user.id))
    .where(
      and(
        statusFilter ? eq(projects.status, statusFilter) : undefined,
        timestampCursorCondition(projects.updatedAt, projects.id, cursor),
      ),
    )
    .orderBy(
      previous ? asc(projects.updatedAt) : desc(projects.updatedAt),
      previous ? asc(projects.id) : desc(projects.id),
    )
    .limit(pageSize + 1);

  return createTimestampCursorPage(rows, pageSize, cursor);
}

export async function getAdminProject(
  projectId: string,
  options: AdminPageOptions = {},
) {
  const projectQuery = getDb()
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      websiteUrl: projects.websiteUrl,
      githubUrl: projects.githubUrl,
      qrCodeUrl: projects.qrCodeUrl,
      status: projects.status,
      rejectionReason: projects.rejectionReason,
      submittedAt: projects.submittedAt,
      approvedAt: projects.approvedAt,
      publishedAt: projects.publishedAt,
      ownerId: projects.ownerId,
      ownerEmail: sql<string>`coalesce(${user.contactEmail}, ${user.email})`,
      ownerUsername: user.username,
      ownerImage: user.image,
    })
    .from(projects)
    .innerJoin(user, eq(projects.ownerId, user.id))
    .where(eq(projects.id, projectId))
    .limit(1);
  const imagesQuery = getDb()
    .select()
    .from(projectImages)
    .where(eq(projectImages.projectId, projectId))
    .orderBy(projectImages.sortOrder);
  const logs = moderationLogPageQuery("project", projectId, options);
  const [projectRows, images, logRows] = await getDb().batch([
    projectQuery,
    imagesQuery,
    logs.query,
  ]);
  const project = projectRows[0];
  if (!project) return null;

  return {
    ...project,
    images,
    logs: createTimestampCursorPage(logRows, logs.pageSize, logs.cursor),
  };
}

export async function getAdminUsers(
  search?: string,
  options: AdminPageOptions = {},
) {
  const filter = search?.trim()
    ? or(
        ilike(user.email, `%${search.trim()}%`),
        ilike(user.contactEmail, `%${search.trim()}%`),
        ilike(user.username, `%${search.trim()}%`),
      )
    : undefined;
  const { cursor, pageSize } = paginationOptions(options, "text");
  const previous = cursor?.direction === "previous";

  const rows = await getDb()
    .select({
      id: user.id,
      email: user.email,
      contactEmail: user.contactEmail,
      username: user.username,
      image: user.image,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      createdAt: user.createdAt,
      projectCount: sql<number>`count(distinct ${projects.id})::int`,
      providers: sql<string>`coalesce(string_agg(distinct ${account.providerId}, ', '), '')`,
      cursorSortValue: exactTimestamp(user.createdAt),
    })
    .from(user)
    .leftJoin(projects, eq(projects.ownerId, user.id))
    .leftJoin(account, eq(account.userId, user.id))
    .where(
      and(filter, timestampCursorCondition(user.createdAt, user.id, cursor)),
    )
    .groupBy(user.id)
    .orderBy(
      previous ? asc(user.createdAt) : desc(user.createdAt),
      previous ? asc(user.id) : desc(user.id),
    )
    .limit(pageSize + 1);

  return createTimestampCursorPage(rows, pageSize, cursor);
}

export async function getAdminUser(userId: string) {
  const [profileRows, ownedProjects] = await getDb().batch([
    getDb()
      .select({
        id: user.id,
        email: user.email,
        contactEmail: user.contactEmail,
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
      .limit(1),
    getDb()
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        status: projects.status,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.updatedAt)),
  ]);
  const profile = profileRows[0];

  if (!profile) return null;

  return { ...profile, projects: ownedProjects };
}

export async function getAuditLogs(
  filters: AuditLogFilters = {},
  options: AdminPageOptions = {},
) {
  const { cursor, pageSize } = paginationOptions(options, "uuid");
  const previous = cursor?.direction === "previous";
  const search = filters.search?.trim();
  const searchFilter = search
    ? or(
        ilike(moderationLogs.action, `%${search}%`),
        ilike(moderationLogs.targetId, `%${search}%`),
        ilike(moderationLogs.reason, `%${search}%`),
        ilike(user.email, `%${search}%`),
        ilike(user.username, `%${search}%`),
      )
    : undefined;
  const rows = await getDb()
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
      cursorSortValue: exactTimestamp(moderationLogs.createdAt),
    })
    .from(moderationLogs)
    .leftJoin(user, eq(moderationLogs.adminId, user.id))
    .where(
      and(
        filters.targetType
          ? eq(moderationLogs.targetType, filters.targetType)
          : undefined,
        searchFilter,
        timestampCursorCondition(
          moderationLogs.createdAt,
          moderationLogs.id,
          cursor,
        ),
      ),
    )
    .orderBy(
      previous ? asc(moderationLogs.createdAt) : desc(moderationLogs.createdAt),
      previous ? asc(moderationLogs.id) : desc(moderationLogs.id),
    )
    .limit(pageSize + 1);

  return createTimestampCursorPage(rows, pageSize, cursor);
}

export async function getAdminFeedback(options: AdminPageOptions = {}) {
  const { cursor, pageSize } = paginationOptions(options, "uuid");
  const previous = cursor?.direction === "previous";

  const rows = await getDb()
    .select({
      id: feedback.id,
      content: feedback.content,
      createdAt: feedback.createdAt,
      userId: feedback.userId,
      userEmail: user.email,
      userUsername: user.username,
      userImage: user.image,
      cursorSortValue: exactTimestamp(feedback.createdAt),
    })
    .from(feedback)
    .innerJoin(user, eq(feedback.userId, user.id))
    .where(timestampCursorCondition(feedback.createdAt, feedback.id, cursor))
    .orderBy(
      previous ? asc(feedback.createdAt) : desc(feedback.createdAt),
      previous ? asc(feedback.id) : desc(feedback.id),
    )
    .limit(pageSize + 1);

  return createTimestampCursorPage(rows, pageSize, cursor);
}
