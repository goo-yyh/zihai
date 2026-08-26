import "server-only";

import { and, asc, count, desc, eq, gt, lt, or } from "drizzle-orm";

import { getDb } from "@/db";
import { ideas, projectImages, projectLikes, projects } from "@/db/schema";
import {
  createCursorPage,
  decodePageCursor,
  normalizePageSize,
  type PageCursor,
} from "@/lib/pagination";

type DashboardPageOptions = {
  cursor?: string;
  pageSize?: number;
};

function ideaCursorCondition(cursor: PageCursor | null) {
  if (!cursor) return undefined;
  const updatedAt = new Date(cursor.sortValue);
  if (cursor.direction === "previous") {
    return or(
      gt(ideas.updatedAt, updatedAt),
      and(eq(ideas.updatedAt, updatedAt), gt(ideas.id, cursor.id)),
    );
  }
  return or(
    lt(ideas.updatedAt, updatedAt),
    and(eq(ideas.updatedAt, updatedAt), lt(ideas.id, cursor.id)),
  );
}

export async function getUserIdeas(
  userId: string,
  options: DashboardPageOptions = {},
) {
  const cursor = decodePageCursor(options.cursor, "uuid");
  const pageSize = normalizePageSize(options.pageSize ?? 20);
  const previous = cursor?.direction === "previous";
  const rows = await getDb()
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
    .where(and(eq(ideas.userId, userId), ideaCursorCondition(cursor)))
    .orderBy(
      previous ? asc(ideas.updatedAt) : desc(ideas.updatedAt),
      previous ? asc(ideas.id) : desc(ideas.id),
    )
    .limit(pageSize + 1);

  return createCursorPage(rows, pageSize, cursor, (idea) => idea.updatedAt);
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
