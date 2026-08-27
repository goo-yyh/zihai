import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  NOTIFICATION_TYPES,
  type NotificationPayload,
  type NotificationType,
} from "@/lib/notifications";

import { user } from "./auth";
import { projects } from "./projects";
import { projectSuggestions } from "./project-suggestions";

export const notificationType = pgEnum("notification_type", NOTIFICATION_TYPES);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    type: notificationType("type").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    suggestionId: uuid("suggestion_id").references(
      () => projectSuggestions.id,
      { onDelete: "set null" },
    ),
    payload: jsonb("payload").$type<NotificationPayload>().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_recipient_created_id_idx").on(
      table.recipientId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("notifications_recipient_unread_created_id_idx")
      .on(table.recipientId, table.createdAt.desc(), table.id.desc())
      .where(sql`${table.readAt} is null`),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type { NotificationType };
