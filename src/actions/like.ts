"use server";

import "server-only";

import { count, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { projectLikes } from "@/db/schema";
import { UserFacingError } from "@/lib/errors";
import { assertOnboardedUser } from "@/lib/session";
import { revalidateProjectLike } from "@/server/cache";
import { scheduleNotification } from "@/server/notifications";

export async function toggleLikeAction(projectId: string) {
  const current = await assertOnboardedUser();
  const id = z.uuid().parse(projectId);
  const actorName = current.user.username || current.user.name || "User";

  // Likes are a low-risk toggle, so this skips withTransaction() on purpose:
  // the whole toggle is one atomic statement (status check, delete, and
  // insert share a snapshot; the unique (user_id, project_id) constraint
  // backs the ON CONFLICT clause for concurrent toggles), and neon-http
  // avoids the per-call WebSocket handshake. The count rides in the same
  // batch, so it still reads the post-toggle state within that transaction.
  const toggleQuery = getDb().execute<{
    projectId: string;
    projectName: string;
    slug: string;
    ownerId: string;
    ownerUsername: string;
    liked: boolean;
  }>(sql`
    WITH target AS (
      SELECT p.id, p.name, p.slug, p.owner_id AS "ownerId", u.username AS "ownerUsername"
      FROM projects p
      JOIN "user" u ON u.id = p.owner_id
      WHERE p.id = ${id} AND p.status = 'approved'
    ),
    removed AS (
      DELETE FROM project_likes pl
      USING target t
      WHERE pl.user_id = ${current.user.id} AND pl.project_id = t.id
      RETURNING 1
    ),
    added AS (
      INSERT INTO project_likes (user_id, project_id)
      SELECT ${current.user.id}, t.id FROM target t
      WHERE NOT EXISTS (SELECT 1 FROM removed)
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    SELECT t.id AS "projectId", t.name AS "projectName", t.slug,
      t."ownerId", t."ownerUsername",
      EXISTS (SELECT 1 FROM added) AS liked
    FROM target t
  `);
  const countQuery = getDb()
    .select({ value: count() })
    .from(projectLikes)
    .where(eq(projectLikes.projectId, id));

  const [toggled, likes] = await getDb().batch([toggleQuery, countQuery]);
  const row = toggled.rows[0];
  if (!row) throw new UserFacingError("Only approved projects can be liked.");

  if (row.liked) {
    scheduleNotification({
      recipientId: row.ownerId,
      actorId: current.user.id,
      type: "project_liked",
      projectId: row.projectId,
      payload: { projectName: row.projectName, actorName },
    });
  }

  revalidateProjectLike(
    { id: row.projectId, slug: row.slug },
    { id: row.ownerId, username: row.ownerUsername },
  );
  return { liked: row.liked, count: likes[0]?.value ?? 0 };
}
