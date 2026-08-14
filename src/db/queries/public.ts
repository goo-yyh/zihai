import "server-only";

import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  iterationImages,
  projectImages,
  projectIterations,
  projectLikes,
  projects,
  user,
} from "@/db/schema";

const cardSelection = {
  id: projects.id,
  name: projects.name,
  slug: projects.slug,
  description: projects.description,
  websiteUrl: projects.websiteUrl,
  githubUrl: projects.githubUrl,
  publishedAt: projects.publishedAt,
  imageUrl: projectImages.blobUrl,
  ownerUsername: user.username,
  ownerImage: user.image,
  likeCount: sql<number>`count(${projectLikes.userId})::int`,
};

function cardQuery(ownerId?: string) {
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
    .where(
      ownerId
        ? and(eq(projects.status, "approved"), eq(projects.ownerId, ownerId))
        : eq(projects.status, "approved"),
    )
    .groupBy(projects.id, projectImages.blobUrl, user.username, user.image);
}

export async function getLatestProjects(limit = 12) {
  return cardQuery().orderBy(desc(projects.publishedAt)).limit(limit);
}

export async function getPopularProjects(limit = 6) {
  return cardQuery()
    .orderBy(
      desc(sql`count(${projectLikes.userId})`),
      desc(projects.publishedAt),
    )
    .limit(limit);
}

export async function getPublicProjectMetadata(slug: string) {
  const [project] = await getDb()
    .select({
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
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
    .where(and(eq(projects.slug, slug), eq(projects.status, "approved")))
    .limit(1);

  return project ?? null;
}

export async function getPublicProject(slug: string, viewerId?: string) {
  const [project] = await getDb()
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
    .where(and(eq(projects.slug, slug), eq(projects.status, "approved")))
    .limit(1);

  if (!project) return null;

  const [images, approvedIterations, likes, viewerLike] = await Promise.all([
    getDb()
      .select({
        id: projectImages.id,
        url: projectImages.blobUrl,
        sortOrder: projectImages.sortOrder,
      })
      .from(projectImages)
      .where(eq(projectImages.projectId, project.id))
      .orderBy(asc(projectImages.sortOrder)),
    getDb()
      .select({
        id: projectIterations.id,
        versionLabel: projectIterations.versionLabel,
        description: projectIterations.description,
        approvedAt: projectIterations.approvedAt,
        createdAt: projectIterations.createdAt,
      })
      .from(projectIterations)
      .where(
        and(
          eq(projectIterations.projectId, project.id),
          eq(projectIterations.status, "approved"),
        ),
      )
      .orderBy(
        desc(projectIterations.approvedAt),
        desc(projectIterations.createdAt),
      ),
    getDb()
      .select({ count: count() })
      .from(projectLikes)
      .where(eq(projectLikes.projectId, project.id)),
    viewerId
      ? getDb()
          .select({ userId: projectLikes.userId })
          .from(projectLikes)
          .where(
            and(
              eq(projectLikes.projectId, project.id),
              eq(projectLikes.userId, viewerId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  const iterationIds = approvedIterations.map((item) => item.id);
  const allIterationImages = iterationIds.length
    ? await getDb()
        .select({
          id: iterationImages.id,
          iterationId: iterationImages.iterationId,
          url: iterationImages.blobUrl,
          sortOrder: iterationImages.sortOrder,
        })
        .from(iterationImages)
        .where(inArray(iterationImages.iterationId, iterationIds))
        .orderBy(asc(iterationImages.sortOrder))
    : [];
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
    viewerLiked: viewerLike.length > 0,
    iterations: approvedIterations.map((iteration) => ({
      ...iteration,
      images: imagesByIteration.get(iteration.id) ?? [],
    })),
  };
}

export async function getPublicProfileMetadata(username: string) {
  const [profile] = await getDb()
    .select({ username: user.username })
    .from(user)
    .where(
      and(
        eq(user.username, username.toLowerCase()),
        eq(user.onboardingCompleted, true),
      ),
    )
    .limit(1);

  return profile?.username ? { username: profile.username } : null;
}

export async function getPublicProfile(username: string) {
  const [profile] = await getDb()
    .select({
      id: user.id,
      username: user.username,
      image: user.image,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(
      and(
        eq(user.username, username.toLowerCase()),
        eq(user.onboardingCompleted, true),
      ),
    )
    .limit(1);

  if (!profile?.username) return null;

  const profileProjects = await cardQuery(profile.id).orderBy(
    desc(projects.publishedAt),
  );

  return { ...profile, projects: profileProjects };
}

export async function getSitemapEntries() {
  const [projectRows, userRows] = await Promise.all([
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
