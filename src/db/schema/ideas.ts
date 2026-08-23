import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { IDEA_STATUSES, type IdeaStatus } from "@/lib/idea-lifecycle";

import { user } from "./auth";

export const ideaStatus = pgEnum("idea_status", IDEA_STATUSES);

export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    status: ideaStatus("status").default("pending").notNull(),
    rejectionReason: text("rejection_reason"),
    resultUrl: text("result_url"),
    githubUrl: text("github_url"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ideas_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("ideas_status_updated_at_idx").on(table.status, table.updatedAt),
    check(
      "ideas_state_details_check",
      sql`(
        (${table.status} = 'pending' and ${table.reviewedAt} is null and ${table.rejectionReason} is null and ${table.resultUrl} is null and ${table.githubUrl} is null and ${table.completedAt} is null)
        or (${table.status} = 'accepted' and ${table.reviewedAt} is not null and ${table.rejectionReason} is null and ${table.resultUrl} is null and ${table.githubUrl} is null and ${table.completedAt} is null)
        or (${table.status} = 'rejected' and ${table.reviewedAt} is not null and length(trim(${table.rejectionReason})) >= 3 and ${table.resultUrl} is null and ${table.githubUrl} is null and ${table.completedAt} is null)
        or (${table.status} = 'completed' and ${table.reviewedAt} is not null and ${table.rejectionReason} is null and num_nonnulls(${table.resultUrl}, ${table.githubUrl}) >= 1 and ${table.completedAt} is not null)
      )`,
    ),
  ],
);

export type Idea = typeof ideas.$inferSelect;
export type { IdeaStatus };
