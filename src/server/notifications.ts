import "server-only";

import { after } from "next/server";

import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import {
  shouldCreateNotification,
  type NotificationPayload,
  type NotificationType,
} from "@/lib/notifications";

type NotificationInsert = {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  projectId?: string | null;
  suggestionId?: string | null;
  payload: NotificationPayload;
};

export function scheduleNotification(event: NotificationInsert) {
  if (!shouldCreateNotification(event.recipientId, event.actorId)) return;

  // Notifications are intentionally lossy: keep their database work outside
  // the originating mutation's response and transaction boundaries.
  after(async () => {
    try {
      await getDb()
        .insert(notifications)
        .values({
          recipientId: event.recipientId,
          actorId: event.actorId ?? null,
          type: event.type,
          projectId: event.projectId ?? null,
          suggestionId: event.suggestionId ?? null,
          payload: event.payload,
        });
    } catch (error) {
      console.error("Unable to persist best-effort notification", {
        type: event.type,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
