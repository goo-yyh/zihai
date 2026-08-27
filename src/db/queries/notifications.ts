import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  isNull,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  createTimestampCursorPage,
  exactTimestamp,
  timestampCursorCondition,
} from "@/db/queries/cursor-pagination";
import { notifications } from "@/db/schema";
import type { NotificationPage } from "@/lib/notifications";
import { decodePageCursor, normalizePageSize } from "@/lib/pagination";

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

export async function getNotificationPage(
  recipientId: string,
  options: { cursor?: string; pageSize?: number } = {},
): Promise<NotificationPage> {
  const cursor = decodePageCursor(options.cursor, "uuid");
  const pageSize = normalizePageSize(options.pageSize ?? 20);
  const previous = cursor?.direction === "previous";
  const rows = await getDb()
    .select({
      ...getTableColumns(notifications),
      cursorSortValue: exactTimestamp(notifications.createdAt),
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, recipientId),
        timestampCursorCondition(
          notifications.createdAt,
          notifications.id,
          cursor,
        ),
      ),
    )
    .orderBy(
      previous ? asc(notifications.createdAt) : desc(notifications.createdAt),
      previous ? asc(notifications.id) : desc(notifications.id),
    )
    .limit(pageSize + 1);
  const page = createTimestampCursorPage(rows, pageSize, cursor);

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
