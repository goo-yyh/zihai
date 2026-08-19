import "server-only";

import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { getDb } from "@/db";
import {
  iterationImages,
  projectImages,
  projectIterations,
  projectLikes,
  projects,
  user,
} from "@/db/schema";
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
const cardSelection = {
  id: projects.id,
  name: projects.name,
  slug: projects.slug,
  description: projects.description,
  websiteUrl: projects.websiteUrl,
  githubUrl: projects.githubUrl,
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
    .where(publicProjectFilter(query))
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
  const totalQuery = getDb()
    .select({ value: countDistinct(projects.id) })
    .from(projects)
    .innerJoin(user, eq(projects.ownerId, user.id))
    .innerJoin(
      projectImages,
      and(
        eq(projectImages.projectId, projects.id),
        eq(projectImages.sortOrder, 0),
      ),
    )
    .where(publicProjectFilter(query));
  const [rows, totals] = await getDb().batch([rowsQuery, totalQuery]);
  const hasMore = rows.length > PUBLIC_PROJECT_PAGE_SIZE;

  return {
    items: rows.slice(0, PUBLIC_PROJECT_PAGE_SIZE),
    nextPage: hasMore ? page + 1 : null,
    totalCount: totals[0]?.value ?? 0,
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

// Returns the latest approved projects as a stable ordered pool; the random
// pick of five happens in the client component so that Server Action
// revalidations (e.g. liking) do not reshuffle the sidebar, while a real page
// load does.
export const getRecommendationPool = cache(async (excludeSlug: string) => {
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
    .where(and(eq(projects.status, "approved"), ne(projects.slug, excludeSlug)))
    .orderBy(desc(projects.publishedAt), desc(projects.id))
    .limit(RECOMMENDATION_POOL_SIZE);
});

async function queryPublicProject(slug: string) {
  const projectFilter = and(
    eq(projects.slug, slug),
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
  const iterationsQuery = getDb()
    .select({
      id: projectIterations.id,
      versionLabel: projectIterations.versionLabel,
      description: projectIterations.description,
      approvedAt: projectIterations.approvedAt,
      createdAt: projectIterations.createdAt,
    })
    .from(projectIterations)
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .where(and(projectFilter, eq(projectIterations.status, "approved")))
    .orderBy(
      desc(projectIterations.approvedAt),
      desc(projectIterations.createdAt),
    );
  const iterationImagesQuery = getDb()
    .select({
      id: iterationImages.id,
      iterationId: iterationImages.iterationId,
      url: iterationImages.blobUrl,
      sortOrder: iterationImages.sortOrder,
    })
    .from(iterationImages)
    .innerJoin(
      projectIterations,
      eq(iterationImages.iterationId, projectIterations.id),
    )
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .where(and(projectFilter, eq(projectIterations.status, "approved")))
    .orderBy(asc(iterationImages.sortOrder));
  const likesQuery = getDb()
    .select({ count: count() })
    .from(projectLikes)
    .innerJoin(projects, eq(projectLikes.projectId, projects.id))
    .where(projectFilter);

  // neon-http sends the statements as one transaction request, avoiding a
  // separate network roundtrip for each public detail relation.
  const [projectRows, images, approvedIterations, allIterationImages, likes] =
    await getDb().batch([
      projectQuery,
      imagesQuery,
      iterationsQuery,
      iterationImagesQuery,
      likesQuery,
    ]);
  const project = projectRows[0];
  if (!project) return null;

  const imagesByIteration = new Map<
    string,
    (typeof allIterationImages)[number][]
  >();
  for (const image of allIterationImages) {
    const images = imagesByIteration.get(image.iterationId) ?? [];
    images.push(image);
    imagesByIteration.set(image.iterationId, images);
  }

  return {
    ...project,
    images,
    likeCount: likes[0]?.count ?? 0,
    iterations: approvedIterations.map((iteration) => ({
      ...iteration,
      images: imagesByIteration.get(iteration.id) ?? [],
    })),
  };
}

export const getPublicProject = cache(async (slug: string) => {
  const getCachedProject = unstable_cache(
    () => queryPublicProject(slug),
    ["public-project", slug],
    {
      revalidate: 3600,
      tags: [PUBLIC_PROJECT_DETAILS_TAG, publicProjectTag(slug)],
    },
  );
  return getCachedProject();
});

export async function getViewerProjectLike(slug: string, viewerId: string) {
  const [like] = await getDb()
    .select({ userId: projectLikes.userId })
    .from(projectLikes)
    .innerJoin(projects, eq(projectLikes.projectId, projects.id))
    .where(
      and(
        eq(projects.slug, slug),
        eq(projects.status, "approved"),
        eq(projectLikes.userId, viewerId),
      ),
    )
    .limit(1);

  return Boolean(like);
}

async function queryPublicProfile(username: string) {
  const normalizedUsername = username.toLowerCase();
  const profileQuery = getDb()
    .select({
      id: user.id,
      username: user.username,
      image: user.image,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(
      and(
        eq(user.username, normalizedUsername),
        eq(user.onboardingCompleted, true),
      ),
    )
    .limit(1);
  const profileProjectsQuery = cardQuery(
    and(
      eq(projects.status, "approved"),
      eq(user.username, normalizedUsername),
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

export const getPublicProfile = cache(async (username: string) => {
  const normalizedUsername = username.toLowerCase();
  const getCachedProfile = unstable_cache(
    () => queryPublicProfile(normalizedUsername),
    ["public-profile", normalizedUsername],
    {
      revalidate: 600,
      tags: [publicProfileTag(normalizedUsername)],
    },
  );
  return getCachedProfile();
});

async function querySitemapEntries() {
  const [projectRows, userRows] = await getDb().batch([
    getDb()
      .select({ slug: projects.slug, updatedAt: projects.updatedAt })
      .from(projects)
      .where(eq(projects.status, "approved")),
    getDb()
      .select({ username: user.username, updatedAt: user.updatedAt })
      .from(user)
      .where(eq(user.onboardingCompleted, true)),
  ]);

  return {
    projects: projectRows,
    users: userRows.filter(
      (row): row is { username: string; updatedAt: Date } =>
        Boolean(row.username),
    ),
  };
}

export const getSitemapEntries = unstable_cache(
  querySitemapEntries,
  ["public-sitemap"],
  { revalidate: 3600, tags: [PUBLIC_SITEMAP_TAG] },
);
