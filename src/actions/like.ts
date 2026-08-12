"use server";

import "server-only";

import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { projectLikes, projects, user } from "@/db/schema";
import { UserFacingError } from "@/lib/errors";
import { assertOnboardedUser } from "@/lib/session";
import { revalidatePublicProject } from "@/server/cache";

export async function toggleLikeAction(projectId: string) {
  const current = await assertOnboardedUser();
  const id = z.uuid().parse(projectId);

  const result = await db.transaction(async (tx) => {
    const [project] = await tx
      .select({
        id: projects.id,
        slug: projects.slug,
        status: projects.status,
        ownerUsername: user.username,
      })
      .from(projects)
      .innerJoin(user, eq(projects.ownerId, user.id))
      .where(eq(projects.id, id))
      .limit(1);
    if (!project || project.status !== "approved") {
      throw new UserFacingError("Only approved projects can be liked.");
    }

    const [existing] = await tx
      .select({ userId: projectLikes.userId })
      .from(projectLikes)
      .where(
        and(
          eq(projectLikes.userId, current.user.id),
          eq(projectLikes.projectId, id),
        ),
      )
      .limit(1);

    let liked: boolean;
    if (existing) {
      await tx
        .delete(projectLikes)
        .where(
          and(
            eq(projectLikes.userId, current.user.id),
            eq(projectLikes.projectId, id),
          ),
        );
      liked = false;
    } else {
      await tx
        .insert(projectLikes)
        .values({ userId: current.user.id, projectId: id })
        .onConflictDoNothing();
      liked = true;
    }

    const [likes] = await tx
      .select({ value: count() })
      .from(projectLikes)
      .where(eq(projectLikes.projectId, id));

    return {
      liked,
      count: likes?.value ?? 0,
      slug: project.slug,
      ownerUsername: project.ownerUsername,
    };
  });

  revalidatePublicProject(result.slug, result.ownerUsername);
  return { liked: result.liked, count: result.count };
}
