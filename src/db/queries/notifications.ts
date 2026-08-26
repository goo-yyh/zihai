import "server-only";

import { and, asc, count, desc, eq, gt, isNull, lt, or } from "drizzle-orm";

import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import type { NotificationPage } from "@/lib/notifications";
import {
  createCursorPage,
  decodePageCursor,
  normalizePageSize,
  type PageCursor,
} from "@/lib/pagination";

export async function getUnreadNotificationCount(recipientId: string) {
  const [result] = await getDb()
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, recipientId),
        isNull(notifications.readAt),
      ),
    );
  return result?.value ?? 0;
}

function cursorCondition(cursor: PageCursor | null) {
  if (!cursor) return undefined;
  const createdAt = new Date(cursor.sortValue);
  if (cursor.direction === "previous") {
    return or(
      gt(notifications.createdAt, createdAt),
      and(
        eq(notifications.createdAt, createdAt),
        gt(notifications.id, cursor.id),
      ),
    );
  }
  return or(
    lt(notifications.createdAt, createdAt),
    and(
      eq(notifications.createdAt, createdAt),
      lt(notifications.id, cursor.id),
    ),
  );
}

export async function getNotificationPage(
  recipientId: string,
  options: { cursor?: string; pageSize?: number } = {},
): Promise<NotificationPage> {
  const cursor = decodePageCursor(options.cursor, "uuid");
  const pageSize = normalizePageSize(options.pageSize ?? 20);
  const previous = cursor?.direction === "previous";
  const rows = await getDb()
    .select()
    .from(notifications)
    .where(
      and(eq(notifications.recipientId, recipientId), cursorCondition(cursor)),
    )
    .orderBy(
      previous ? asc(notifications.createdAt) : desc(notifications.createdAt),
      previous ? asc(notifications.id) : desc(notifications.id),
    )
    .limit(pageSize + 1);
  const page = createCursorPage(
    rows,
    pageSize,
    cursor,
    (item) => item.createdAt,
  );

  return {
    items: page.items.map((item) => ({
      id: item.id,
      type: item.type,
      payload: item.payload,
      projectId: item.projectId,
      suggestionId: item.suggestionId,
      actorId: item.actorId,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
    previousCursor: page.previousCursor,
    nextCursor: page.nextCursor,
  };
}
