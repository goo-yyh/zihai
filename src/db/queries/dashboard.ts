import "server-only";

import { and, asc, count, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  ideas,
  iterationImages,
  projectImages,
  projectIterations,
  projectLikes,
  projects,
} from "@/db/schema";

export async function getUserIdeas(userId: string) {
  return getDb()
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
    })
    .from(ideas)
    .where(eq(ideas.userId, userId))
    .orderBy(desc(ideas.updatedAt));
}

export async function getUserProjects(ownerId: string) {
  return getDb()
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      status: projects.status,
      rejectionReason: projects.rejectionReason,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      likeCount: count(projectLikes.userId),
    })
    .from(projects)
    .leftJoin(projectLikes, eq(projectLikes.projectId, projects.id))
    .where(eq(projects.ownerId, ownerId))
    .groupBy(projects.id)
    .orderBy(desc(projects.updatedAt));
}

export async function getUserProjectCount(ownerId: string) {
  const [result] = await getDb()
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.ownerId, ownerId));

  return result?.value ?? 0;
}

export async function getOwnedProject(projectId: string, ownerId: string) {
  const projectQuery = getDb()
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);
  const imagesQuery = getDb()
    .select({ image: projectImages })
    .from(projectImages)
    .innerJoin(projects, eq(projectImages.projectId, projects.id))
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .orderBy(asc(projectImages.sortOrder));
  const iterationsQuery = getDb()
    .select()
    .from(projectIterations)
    .where(
      and(
        eq(projectIterations.projectId, projectId),
        eq(projectIterations.ownerId, ownerId),
      ),
    )
    .orderBy(desc(projectIterations.createdAt));
  const [projectRows, imageRows, iterations] = await getDb().batch([
    projectQuery,
    imagesQuery,
    iterationsQuery,
  ]);
  const project = projectRows[0];
  if (!project) return null;
  const images = imageRows.map(({ image }) => image);

  return { ...project, images, iterations };
}

export async function getOwnedIteration(iterationId: string, ownerId: string) {
  const iterationQuery = getDb()
    .select({
      id: projectIterations.id,
      projectId: projectIterations.projectId,
      ownerId: projectIterations.ownerId,
      versionLabel: projectIterations.versionLabel,
      description: projectIterations.description,
      status: projectIterations.status,
      rejectionReason: projectIterations.rejectionReason,
      createdAt: projectIterations.createdAt,
      updatedAt: projectIterations.updatedAt,
      projectName: projects.name,
      projectSlug: projects.slug,
      projectStatus: projects.status,
    })
    .from(projectIterations)
    .innerJoin(projects, eq(projectIterations.projectId, projects.id))
    .where(
      and(
        eq(projectIterations.id, iterationId),
        eq(projectIterations.ownerId, ownerId),
      ),
    )
    .limit(1);
  const imagesQuery = getDb()
    .select({ image: iterationImages })
    .from(iterationImages)
    .innerJoin(
      projectIterations,
      eq(iterationImages.iterationId, projectIterations.id),
    )
    .where(
      and(
        eq(projectIterations.id, iterationId),
        eq(projectIterations.ownerId, ownerId),
      ),
    )
    .orderBy(asc(iterationImages.sortOrder));
  const [iterationRows, imageRows] = await getDb().batch([
    iterationQuery,
    imagesQuery,
  ]);
  const iteration = iterationRows[0];
  if (!iteration) return null;
  const images = imageRows.map(({ image }) => image);

  return { ...iteration, images };
}

export async function getImagePathnamesForProject(projectId: string) {
  const [projectRows, iterationRows] = await getDb().batch([
    getDb()
      .select({ pathname: projectImages.blobPathname })
      .from(projectImages)
      .where(eq(projectImages.projectId, projectId)),
    getDb()
      .select({ pathname: iterationImages.blobPathname })
      .from(iterationImages)
      .innerJoin(
        projectIterations,
        eq(iterationImages.iterationId, projectIterations.id),
      )
      .where(eq(projectIterations.projectId, projectId)),
  ]);

  return [...projectRows, ...iterationRows].map((item) => item.pathname);
}
