"use server";

import "server-only";

import { and, desc, eq, getTableColumns, isNull } from "drizzle-orm";

import { withTransaction } from "@/db";
import {
  createTimestampCursorPage,
  exactTimestamp,
} from "@/db/queries/cursor-pagination";
import { notifications } from "@/db/schema";
import { isUserFacingError } from "@/lib/errors";
import type { NotificationPage } from "@/lib/notifications";
import { assertOnboardedUser } from "@/lib/session";

export type OpenNotificationsResult =
  | { status: "success"; page: NotificationPage }
  | { status: "error"; message: string };

export async function openNotificationsAction(): Promise<OpenNotificationsResult> {
  try {
    const session = await assertOnboardedUser();
    const page = await withTransaction(async (tx) => {
      const readAt = new Date();
      await tx
        .update(notifications)
        .set({ readAt })
        .where(
          and(
            eq(notifications.recipientId, session.user.id),
            isNull(notifications.readAt),
          ),
        );

      const rows = await tx
        .select({
          ...getTableColumns(notifications),
          cursorSortValue: exactTimestamp(notifications.createdAt),
        })
        .from(notifications)
        .where(eq(notifications.recipientId, session.user.id))
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(21);
      const result = createTimestampCursorPage(rows, 20, null);
      return {
        items: result.items.map((item) => ({
          id: item.id,
          type: item.type,
          payload: item.payload,
          projectId: item.projectId,
          suggestionId: item.suggestionId,
          actorId: item.actorId,
          readAt: item.readAt?.toISOString() ?? null,
          createdAt: item.createdAt.toISOString(),
        })),
        previousCursor: result.previousCursor,
        nextCursor: result.nextCursor,
      } satisfies NotificationPage;
    });
    return { status: "success", page };
  } catch (error) {
    if (!isUserFacingError(error)) {
      console.error("Unable to open notifications", error);
    }
    return {
      status: "error",
      message: isUserFacingError(error)
        ? error.message
        : "Unable to load notifications.",
    };
  }
}
