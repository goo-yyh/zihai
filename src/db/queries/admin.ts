import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  lt,
  or,
  sql,
  type SQLWrapper,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  account,
  ITERATION_STATUSES,
  iterationImages,
  moderationLogs,
  projectImages,
  projectIterations,
  PROJECT_STATUSES,
  projects,
  user,
} from "@/db/schema";
import {
  createCursorPage,
  decodePageCursor,
  DEFAULT_ADMIN_PAGE_SIZE,
  normalizePageSize,
  type CursorIdKind,
  type PageCursor,
} from "@/lib/pagination";

type AdminPageOptions = {
  cursor?: string;
  pageSize?: number;
};

type AuditLogFilters = {
  search?: string;
  targetType?: "project" | "iteration" | "user";
};

function keysetCondition(
  sortColumn: SQLWrapper,
  idColumn: SQLWrapper,
  cursor: PageCursor | null,
) {
  if (!cursor) return undefined;

  const sortValue = new Date(cursor.sortValue);
  if (cursor.direction === "previous") {
    return or(
      gt(sortColumn, sortValue),
      and(eq(sortColumn, sortValue), gt(idColumn, cursor.id)),
    );
  }

  return or(
    lt(sortColumn, sortValue),
    and(eq(sortColumn, sortValue), lt(idColumn, cursor.id)),
  );
}

function paginationOptions(options: AdminPageOptions, idKind: CursorIdKind) {
  return {
    cursor: decodePageCursor(options.cursor, idKind),
    pageSize: normalizePageSize(options.pageSize ?? DEFAULT_ADMIN_PAGE_SIZE),
  };
}

export async function getAdminStats() {
  const [stats] = await getDb()
    .select({
      users: sql<number>`(select count(*)::int from ${user})`,
      projects: sql<number>`count(*)::int`,
      pendingProjects: sql<number>`count(*) filter (where ${projects.status} = 'pending')::int`,
      approvedProjects: sql<number>`count(*) filter (where ${projects.status} = 'approved')::int`,
      rejectedProjects: sql<number>`count(*) filter (where ${projects.status} = 'rejected')::int`,
      pendingIterations: sql<number>`(
        select count(*)::int
        from ${projectIterations}
        where ${projectIterations.status} = 'pending'
      )`,
    })
    .from(projects);

  return {
    users: stats?.users ?? 0,
    projects: stats?.projects ?? 0,
    pendingProjects: stats?.pendingProjects ?? 0,
    approvedProjects: stats?.approvedProjects ?? 0,
    rejectedProjects: stats?.rejectedProjects ?? 0,
    pendingIterations: stats?.pendingIterations ?? 0,
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
    })
    .from(projects)
    .innerJoin(user, eq(projects.ownerId, user.id))
    .where(
      and(
        statusFilter ? eq(projects.status, statusFilter) : undefined,
        keysetCondition(projects.updatedAt, projects.id, cursor),
      ),
    )
    .orderBy(
      previous ? asc(projects.updatedAt) : desc(projects.updatedAt),
      previous ? asc(projects.id) : desc(projects.id),
    )
    .limit(pageSize + 1);

  return createCursorPage(
    rows,
    pageSize,
    cursor,
    (project) => project.updatedAt,
  );
}

export async function getAdminProject(projectId: string) {
  const projectQuery = getDb()
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
  const logsQuery = getDb()
    .select()
    .from(moderationLogs)
    .where(
      and(
        eq(moderationLogs.targetType, "project"),
        eq(moderationLogs.targetId, projectId),
      ),
    )
    .orderBy(desc(moderationLogs.createdAt));
  const [projectRows, images, logs] = await getDb().batch([
    projectQuery,
    imagesQuery,
    logsQuery,
  ]);
  const project = projectRows[0];
  if (!project) return null;

  return { ...project, images, logs };
}

export async function getAdminIterations(
  status?: string,
  options: AdminPageOptions = {},
) {
  const statusFilter = ITERATION_STATUSES.find((value) => value === status);
  const { cursor, pageSize } = paginationOptions(options, "uuid");
  const previous = cursor?.direction === "previous";

  const rows = await getDb()
    .select({
      id: projectIterations.id,
      projectId: projectIterations.projectId,
      projectName: projects.name,
      versionLabel: projectIterations.versionLabel,
      description: projectIterations.description,
      status: projectIterations.status,
      submittedAt: projectIterations.submittedAt,
      updatedAt: projectIterations.updatedAt,
      ownerUsername: user.username,
    })
    .from(projectIterations)
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .innerJoin(user, eq(projectIterations.ownerId, user.id))
    .where(
      and(
        statusFilter ? eq(projectIterations.status, statusFilter) : undefined,
        keysetCondition(
          projectIterations.updatedAt,
          projectIterations.id,
          cursor,
        ),
      ),
    )
    .orderBy(
      previous
        ? asc(projectIterations.updatedAt)
        : desc(projectIterations.updatedAt),
      previous ? asc(projectIterations.id) : desc(projectIterations.id),
    )
    .limit(pageSize + 1);

  return createCursorPage(
    rows,
    pageSize,
    cursor,
    (iteration) => iteration.updatedAt,
  );
}

export async function getAdminIteration(iterationId: string) {
  const iterationQuery = getDb()
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
      ownerEmail: sql<string>`coalesce(${user.contactEmail}, ${user.email})`,
      ownerUsername: user.username,
      ownerImage: user.image,
    })
    .from(projectIterations)
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .innerJoin(user, eq(projectIterations.ownerId, user.id))
    .where(eq(projectIterations.id, iterationId))
    .limit(1);
  const imagesQuery = getDb()
    .select()
    .from(iterationImages)
    .where(eq(iterationImages.iterationId, iterationId))
    .orderBy(iterationImages.sortOrder);
  const logsQuery = getDb()
    .select()
    .from(moderationLogs)
    .where(
      and(
        eq(moderationLogs.targetType, "iteration"),
        eq(moderationLogs.targetId, iterationId),
      ),
    )
    .orderBy(desc(moderationLogs.createdAt));
  const [iterationRows, images, logs] = await getDb().batch([
    iterationQuery,
    imagesQuery,
    logsQuery,
  ]);
  const iteration = iterationRows[0];
  if (!iteration) return null;

  return { ...iteration, images, logs };
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
    })
    .from(user)
    .leftJoin(projects, eq(projects.ownerId, user.id))
    .leftJoin(account, eq(account.userId, user.id))
    .where(and(filter, keysetCondition(user.createdAt, user.id, cursor)))
    .groupBy(user.id)
    .orderBy(
      previous ? asc(user.createdAt) : desc(user.createdAt),
      previous ? asc(user.id) : desc(user.id),
    )
    .limit(pageSize + 1);

  return createCursorPage(
    rows,
    pageSize,
    cursor,
    (profile) => profile.createdAt,
  );
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
    })
    .from(moderationLogs)
    .leftJoin(user, eq(moderationLogs.adminId, user.id))
    .where(
      and(
        filters.targetType
          ? eq(moderationLogs.targetType, filters.targetType)
          : undefined,
        searchFilter,
        keysetCondition(moderationLogs.createdAt, moderationLogs.id, cursor),
      ),
    )
    .orderBy(
      previous ? asc(moderationLogs.createdAt) : desc(moderationLogs.createdAt),
      previous ? asc(moderationLogs.id) : desc(moderationLogs.id),
    )
    .limit(pageSize + 1);

  return createCursorPage(rows, pageSize, cursor, (log) => log.createdAt);
}
