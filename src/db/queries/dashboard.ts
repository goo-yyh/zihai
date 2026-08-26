import "server-only";

import { and, asc, count, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { ideas, projectImages, projectLikes, projects } from "@/db/schema";

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
  const [projectRows, imageRows] = await getDb().batch([
    projectQuery,
    imagesQuery,
  ]);
  const project = projectRows[0];
  if (!project) return null;
  const images = imageRows.map(({ image }) => image);

  return { ...project, images };
}

export async function getImagePathnamesForProject(projectId: string) {
  const rows = await getDb()
    .select({ pathname: projectImages.blobPathname })
    .from(projectImages)
    .where(eq(projectImages.projectId, projectId));

  return rows.map((item) => item.pathname);
}
