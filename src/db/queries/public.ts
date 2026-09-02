import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { z } from "zod";

import { getDb } from "@/db";
import { projectImages, projectLikes, projects, user } from "@/db/schema";
import {
  projectSearchPatterns,
  PUBLIC_PROJECT_PAGE_SIZE,
} from "@/lib/project-discovery";
import {
  PUBLIC_PROJECT_DETAILS_TAG,
  PUBLIC_PROJECT_LIST_TAG,
  PUBLIC_SITEMAP_TAG,
  publicProfileTag,
  publicProjectTag,
} from "@/lib/cache-tags";
import type { PublicProjectPage, PublicProjectSort } from "@/types/projects";

const likeCount = count(projectLikes.userId);
const projectIdSchema = z.uuid();
const cardSelection = {
  id: projects.id,
  name: projects.name,
  slug: projects.slug,
  description: projects.description,
  websiteUrl: projects.websiteUrl,
  githubUrl: projects.githubUrl,
  qrCodeUrl: projects.qrCodeUrl,
  imageUrl: projectImages.blobUrl,
  ownerUsername: user.username,
  ownerImage: user.image,
  likeCount,
};

function cardQuery(filter: SQL | undefined) {
  return getDb()
    .select(cardSelection)
    .from(projects)
    .innerJoin(user, eq(projects.ownerId, user.id))
    .innerJoin(
      projectImages,
      and(
        eq(projectImages.projectId, projects.id),
        eq(projectImages.sortOrder, 0),
      ),
    )
    .leftJoin(projectLikes, eq(projectLikes.projectId, projects.id))
    .where(filter)
    .groupBy(projects.id, projectImages.blobUrl, user.username, user.image);
}

function publicProjectFilter(query: string) {
  return and(
    eq(projects.status, "approved"),
    ...projectSearchPatterns(query).map((pattern) =>
      or(ilike(projects.name, pattern), ilike(projects.description, pattern)),
    ),
  );
}

async function queryPublicProjects({
  sort,
  query,
  page,
}: {
  sort: PublicProjectSort;
  query: string;
  page: number;
}): Promise<PublicProjectPage> {
  const filter = publicProjectFilter(query);
  const baseQuery = getDb()
    .select(cardSelection)
    .from(projects)
    .innerJoin(user, eq(projects.ownerId, user.id))
    .innerJoin(
      projectImages,
      and(
        eq(projectImages.projectId, projects.id),
        eq(projectImages.sortOrder, 0),
      ),
    )
    .leftJoin(projectLikes, eq(projectLikes.projectId, projects.id))
    .where(filter)
    .groupBy(projects.id, projectImages.blobUrl, user.username, user.image);
  const orderedQuery =
    sort === "hot"
      ? baseQuery.orderBy(
          desc(likeCount),
          desc(projects.publishedAt),
          desc(projects.id),
        )
      : baseQuery.orderBy(desc(projects.publishedAt), desc(projects.id));
  const rowsQuery = orderedQuery
    .limit(PUBLIC_PROJECT_PAGE_SIZE + 1)
    .offset((page - 1) * PUBLIC_PROJECT_PAGE_SIZE);
  if (page === 1) {
    const totalQuery = getDb()
      .select({ value: count(projects.id) })
      .from(projects)
      .where(filter)
      .innerJoin(user, eq(projects.ownerId, user.id));
    const [rows, totals] = await getDb().batch([rowsQuery, totalQuery]);
    const hasMore = rows.length > PUBLIC_PROJECT_PAGE_SIZE;

    return {
      items: rows.slice(0, PUBLIC_PROJECT_PAGE_SIZE),
      nextPage: hasMore ? page + 1 : null,
      totalCount: totals[0]?.value ?? 0,
    };
  }

  const rows = await rowsQuery;
  const hasMore = rows.length > PUBLIC_PROJECT_PAGE_SIZE;

  return {
    items: rows.slice(0, PUBLIC_PROJECT_PAGE_SIZE),
    nextPage: hasMore ? page + 1 : null,
    totalCount: null,
  };
}

const getCachedPublicProjects = unstable_cache(
  queryPublicProjects,
  ["public-project-list"],
  {
    revalidate: 300,
    tags: [PUBLIC_PROJECT_LIST_TAG],
  },
);

export const getPublicProjects = cache(getCachedPublicProjects);

const RECOMMENDATION_POOL_SIZE = 20;

// Returns the latest approved projects as a stable ordered pool. The public
// page selects a random server snapshot before passing it to the client so the
// server-rendered HTML and hydration payload always agree.
async function queryRecommendationPool(excludeProjectId: string) {
  return getDb()
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      imageUrl: projectImages.blobUrl,
    })
    .from(projects)
    .innerJoin(
      projectImages,
      and(
        eq(projectImages.projectId, projects.id),
        eq(projectImages.sortOrder, 0),
      ),
    )
    .where(
      and(eq(projects.status, "approved"), ne(projects.id, excludeProjectId)),
    )
    .orderBy(desc(projects.publishedAt), desc(projects.id))
    .limit(RECOMMENDATION_POOL_SIZE);
}

const getCachedRecommendationPool = unstable_cache(
  queryRecommendationPool,
  ["public-project-recommendation-pool"],
  {
    revalidate: 300,
    tags: [PUBLIC_PROJECT_LIST_TAG],
  },
);

export const getRecommendationPool = cache(getCachedRecommendationPool);

async function queryPublicProject(projectId: string) {
  const projectFilter = and(
    eq(projects.id, projectId),
    eq(projects.status, "approved"),
  );
  const projectQuery = getDb()
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      websiteUrl: projects.websiteUrl,
      githubUrl: projects.githubUrl,
      qrCodeUrl: projects.qrCodeUrl,
      publishedAt: projects.publishedAt,
      ownerId: projects.ownerId,
      ownerUsername: user.username,
      ownerImage: user.image,
      ownerCreatedAt: user.createdAt,
    })
    .from(projects)
    .innerJoin(user, eq(projects.ownerId, user.id))
    .where(projectFilter)
    .limit(1);
  const imagesQuery = getDb()
    .select({
      id: projectImages.id,
      url: projectImages.blobUrl,
      sortOrder: projectImages.sortOrder,
    })
    .from(projectImages)
    .innerJoin(projects, eq(projectImages.projectId, projects.id))
    .where(projectFilter)
    .orderBy(asc(projectImages.sortOrder));
  const likesQuery = getDb()
    .select({ count: count() })
    .from(projectLikes)
    .innerJoin(projects, eq(projectLikes.projectId, projects.id))
    .where(projectFilter);

  // neon-http sends the statements as one transaction request, avoiding a
  // separate network roundtrip for each public detail relation.
  const [projectRows, images, likes] = await getDb().batch([
    projectQuery,
    imagesQuery,
    likesQuery,
  ]);
  const project = projectRows[0];
  if (!project?.ownerUsername) return null;

  return {
    ...project,
    ownerUsername: project.ownerUsername,
    images,
    likeCount: likes[0]?.count ?? 0,
  };
}

export const getPublicProject = cache(async (projectId: string) => {
  if (!projectIdSchema.safeParse(projectId).success) return null;
  const getCachedProject = unstable_cache(
    () => queryPublicProject(projectId),
    ["public-project", projectId],
    {
      revalidate: 3600,
      tags: [PUBLIC_PROJECT_DETAILS_TAG, publicProjectTag(projectId)],
    },
  );
  return getCachedProject();
});

export async function getViewerProjectLike(
  projectId: string,
  viewerId: string,
) {
  if (!projectIdSchema.safeParse(projectId).success) return false;
  const [like] = await getDb()
    .select({ userId: projectLikes.userId })
    .from(projectLikes)
    .innerJoin(projects, eq(projectLikes.projectId, projects.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.status, "approved"),
        eq(projectLikes.userId, viewerId),
      ),
    )
    .limit(1);

  return Boolean(like);
}

async function queryPublicProfile(userId: string) {
  const profileQuery = getDb()
    .select({
      id: user.id,
      username: user.username,
      image: user.image,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(and(eq(user.id, userId), eq(user.onboardingCompleted, true)))
    .limit(1);
  const profileProjectsQuery = cardQuery(
    and(
      eq(projects.status, "approved"),
      eq(user.id, userId),
      eq(user.onboardingCompleted, true),
    ),
  ).orderBy(desc(projects.publishedAt));
  const [profiles, profileProjects] = await getDb().batch([
    profileQuery,
    profileProjectsQuery,
  ]);
  const profile = profiles[0];
  if (!profile?.username) return null;

  return { ...profile, username: profile.username, projects: profileProjects };
}

export const getPublicProfile = cache(async (userId: string) => {
  const getCachedProfile = unstable_cache(
    () => queryPublicProfile(userId),
    ["public-profile", userId],
    {
      revalidate: 600,
      tags: [publicProfileTag(userId)],
    },
  );
  return getCachedProfile();
});

export const getPublicProjectRouteBySlug = cache(async (slug: string) => {
  const [project] = await getDb()
    .select({ id: projects.id, slug: projects.slug })
    .from(projects)
    .where(and(eq(projects.slug, slug), eq(projects.status, "approved")))
    .limit(1);
  return project ?? null;
});

export const getPublicProfileRouteByUsername = cache(
  async (username: string) => {
    const [profile] = await getDb()
      .select({ id: user.id, username: user.username })
      .from(user)
      .where(
        and(
          eq(user.username, username.toLowerCase()),
          eq(user.onboardingCompleted, true),
        ),
      )
      .limit(1);
    if (!profile?.username) return null;
    return { id: profile.id, username: profile.username };
  },
);

async function querySitemapEntries() {
  const [projectRows, userRows] = await getDb().batch([
    getDb()
      .select({
        id: projects.id,
        slug: projects.slug,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(eq(projects.status, "approved")),
    getDb()
      .select({
        id: user.id,
        username: user.username,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.onboardingCompleted, true)),
  ]);

  return {
    projects: projectRows,
    users: userRows.filter(
      (row): row is { id: string; username: string; updatedAt: Date } =>
        Boolean(row.username),
    ),
  };
}

export const getSitemapEntries = unstable_cache(
  querySitemapEntries,
  ["public-sitemap"],
  { revalidate: 3600, tags: [PUBLIC_SITEMAP_TAG] },
);
