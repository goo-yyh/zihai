import "server-only";

import { and, asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  iterationImages,
  projectImages,
  projectIterations,
  projectLikes,
  projects,
} from "@/db/schema";

export async function getUserProjects(ownerId: string) {
  return db
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

export async function getOwnedProject(projectId: string, ownerId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);

  if (!project) return null;

  const [images, iterations] = await Promise.all([
    db
      .select()
      .from(projectImages)
      .where(eq(projectImages.projectId, project.id))
      .orderBy(asc(projectImages.sortOrder)),
    db
      .select()
      .from(projectIterations)
      .where(eq(projectIterations.projectId, project.id))
      .orderBy(desc(projectIterations.createdAt)),
  ]);

  return { ...project, images, iterations };
}

export async function getOwnedIteration(iterationId: string, ownerId: string) {
  const [iteration] = await db
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

  if (!iteration) return null;

  const images = await db
    .select()
    .from(iterationImages)
    .where(eq(iterationImages.iterationId, iteration.id))
    .orderBy(asc(iterationImages.sortOrder));

  return { ...iteration, images };
}

export async function getImagePathnamesForProject(projectId: string) {
  const [projectRows, iterationRows] = await Promise.all([
    db
      .select({ pathname: projectImages.blobPathname })
      .from(projectImages)
      .where(eq(projectImages.projectId, projectId)),
    db
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
