import "server-only";

import { and, asc, count, desc, eq, gt, lt, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { getDb } from "@/db";
import { projectSuggestions, projects, user } from "@/db/schema";
import {
  PUBLIC_PROJECT_SUGGESTIONS_TAG,
  publicProjectSuggestionsTag,
} from "@/lib/cache-tags";
import {
  createCursorPage,
  decodePageCursor,
  normalizePageSize,
  type PageCursor,
} from "@/lib/pagination";
import type { ProjectSuggestionStatus } from "@/lib/project-suggestion-lifecycle";

const suggestionAuthor = alias(user, "suggestion_author");
const projectOwner = alias(user, "suggestion_project_owner");

export type ProjectSuggestionFilters = {
  status?: ProjectSuggestionStatus;
};

export type SuggestionPageOptions = {
  cursor?: string;
  pageSize?: number;
};

function keysetCondition(cursor: PageCursor | null) {
  if (!cursor) return undefined;
  const createdAt = new Date(cursor.sortValue);
  if (cursor.direction === "previous") {
    return or(
      gt(projectSuggestions.createdAt, createdAt),
      and(
        eq(projectSuggestions.createdAt, createdAt),
        gt(projectSuggestions.id, cursor.id),
      ),
    );
  }
  return or(
    lt(projectSuggestions.createdAt, createdAt),
    and(
      eq(projectSuggestions.createdAt, createdAt),
      lt(projectSuggestions.id, cursor.id),
    ),
  );
}

function suggestionFilter(
  filters: ProjectSuggestionFilters,
  cursor: PageCursor | null,
  scope?: SQL,
) {
  return and(
    scope,
    filters.status ? eq(projectSuggestions.status, filters.status) : undefined,
    keysetCondition(cursor),
  );
}

const dashboardSelection = {
  id: projectSuggestions.id,
  projectId: projectSuggestions.projectId,
  projectName: projects.name,
  projectSlug: projects.slug,
  projectStatus: projects.status,
  authorId: projectSuggestions.authorId,
  authorUsername: suggestionAuthor.username,
  authorImage: suggestionAuthor.image,
  ownerId: projects.ownerId,
  ownerUsername: projectOwner.username,
  ownerImage: projectOwner.image,
  content: projectSuggestions.content,
  status: projectSuggestions.status,
  rejectionReason: projectSuggestions.rejectionReason,
  respondedAt: projectSuggestions.respondedAt,
  completedAt: projectSuggestions.completedAt,
  createdAt: projectSuggestions.createdAt,
  updatedAt: projectSuggestions.updatedAt,
};

function dashboardSuggestionQuery(filter?: SQL) {
  return getDb()
    .select(dashboardSelection)
    .from(projectSuggestions)
    .innerJoin(projects, eq(projectSuggestions.projectId, projects.id))
    .innerJoin(
      suggestionAuthor,
      eq(projectSuggestions.authorId, suggestionAuthor.id),
    )
    .innerJoin(projectOwner, eq(projects.ownerId, projectOwner.id))
    .where(filter);
}

async function dashboardSuggestionPage(
  scope: SQL,
  filters: ProjectSuggestionFilters,
  options: SuggestionPageOptions,
) {
  const cursor = decodePageCursor(options.cursor, "uuid");
  const pageSize = normalizePageSize(options.pageSize ?? 20);
  const previous = cursor?.direction === "previous";
  const rows = await dashboardSuggestionQuery(
    suggestionFilter(filters, cursor, scope),
  )
    .orderBy(
      previous
        ? asc(projectSuggestions.createdAt)
        : desc(projectSuggestions.createdAt),
      previous ? asc(projectSuggestions.id) : desc(projectSuggestions.id),
    )
    .limit(pageSize + 1);

  return createCursorPage(rows, pageSize, cursor, (item) => item.createdAt);
}

export function getReceivedProjectSuggestions(
  ownerId: string,
  filters: ProjectSuggestionFilters = {},
  options: SuggestionPageOptions = {},
) {
  return dashboardSuggestionPage(
    eq(projects.ownerId, ownerId),
    filters,
    options,
  );
}

export type DashboardProjectSuggestion = Awaited<
  ReturnType<typeof getReceivedProjectSuggestions>
>["items"][number];

export function getSubmittedProjectSuggestions(
  authorId: string,
  filters: ProjectSuggestionFilters = {},
  options: SuggestionPageOptions = {},
) {
  return dashboardSuggestionPage(
    eq(projectSuggestions.authorId, authorId),
    filters,
    options,
  );
}

export async function getFocusedProjectSuggestion(
  suggestionId: string,
  userId: string,
  view: "received" | "submitted",
) {
  const scope =
    view === "received"
      ? eq(projects.ownerId, userId)
      : eq(projectSuggestions.authorId, userId);
  const rows = await dashboardSuggestionQuery(
    and(eq(projectSuggestions.id, suggestionId), scope),
  ).limit(1);
  return rows[0] ?? null;
}

async function queryProjectSuggestionSummary(projectId: string) {
  const publicFilter = and(
    eq(projectSuggestions.projectId, projectId),
    eq(projects.status, "approved"),
  );
  const itemsQuery = getDb()
    .select({
      id: projectSuggestions.id,
      content: projectSuggestions.content,
      status: projectSuggestions.status,
      rejectionReason: projectSuggestions.rejectionReason,
      createdAt: projectSuggestions.createdAt,
      respondedAt: projectSuggestions.respondedAt,
      completedAt: projectSuggestions.completedAt,
      author: {
        id: suggestionAuthor.id,
        username: suggestionAuthor.username,
        image: suggestionAuthor.image,
      },
    })
    .from(projectSuggestions)
    .innerJoin(projects, eq(projectSuggestions.projectId, projects.id))
    .innerJoin(
      suggestionAuthor,
      eq(projectSuggestions.authorId, suggestionAuthor.id),
    )
    .where(publicFilter)
    .orderBy(desc(projectSuggestions.createdAt), desc(projectSuggestions.id))
    .limit(3);
  const countQuery = getDb()
    .select({ value: count() })
    .from(projectSuggestions)
    .innerJoin(projects, eq(projectSuggestions.projectId, projects.id))
    .where(publicFilter);
  const [items, totals] = await getDb().batch([itemsQuery, countQuery]);

  return {
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      respondedAt: item.respondedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
    })),
    totalCount: totals[0]?.value ?? 0,
  };
}

export const getProjectSuggestionSummary = cache(async (projectId: string) => {
  const getCachedSummary = unstable_cache(
    () => queryProjectSuggestionSummary(projectId),
    ["public-project-suggestion-summary", projectId],
    {
      revalidate: 3600,
      tags: [
        PUBLIC_PROJECT_SUGGESTIONS_TAG,
        publicProjectSuggestionsTag(projectId),
      ],
    },
  );
  return getCachedSummary();
});

export async function getPublicProjectSuggestions(
  projectId: string,
  filters: ProjectSuggestionFilters = {},
  options: SuggestionPageOptions = {},
) {
  const cursor = decodePageCursor(options.cursor, "uuid");
  const pageSize = normalizePageSize(options.pageSize ?? 10);
  const previous = cursor?.direction === "previous";
  const publicScope = and(
    eq(projectSuggestions.projectId, projectId),
    eq(projects.status, "approved"),
  );
  const projectQuery = getDb()
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.status, "approved")))
    .limit(1);
  const rowsQuery = getDb()
    .select({
      id: projectSuggestions.id,
      content: projectSuggestions.content,
      status: projectSuggestions.status,
      rejectionReason: projectSuggestions.rejectionReason,
      createdAt: projectSuggestions.createdAt,
      respondedAt: projectSuggestions.respondedAt,
      completedAt: projectSuggestions.completedAt,
      author: {
        id: suggestionAuthor.id,
        username: suggestionAuthor.username,
        image: suggestionAuthor.image,
      },
    })
    .from(projectSuggestions)
    .innerJoin(projects, eq(projectSuggestions.projectId, projects.id))
    .innerJoin(
      suggestionAuthor,
      eq(projectSuggestions.authorId, suggestionAuthor.id),
    )
    .where(suggestionFilter(filters, cursor, publicScope))
    .orderBy(
      previous
        ? asc(projectSuggestions.createdAt)
        : desc(projectSuggestions.createdAt),
      previous ? asc(projectSuggestions.id) : desc(projectSuggestions.id),
    )
    .limit(pageSize + 1);
  const [projectRows, rows] = await getDb().batch([projectQuery, rowsQuery]);
  if (!projectRows[0]) return null;

  const page = createCursorPage(
    rows,
    pageSize,
    cursor,
    (item) => item.createdAt,
  );
  return {
    ...page,
    items: page.items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      respondedAt: item.respondedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
    })),
  };
}
