import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import {
  PROJECT_SUGGESTION_STATUSES,
  type ProjectSuggestionStatus,
} from "@/lib/project-suggestion-lifecycle";

import { user } from "./auth";
import { projects } from "./projects";

export const projectSuggestionStatus = pgEnum(
  "project_suggestion_status",
  PROJECT_SUGGESTION_STATUSES,
);

export const projectSuggestions = pgTable(
  "project_suggestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    status: projectSuggestionStatus("status").default("pending").notNull(),
    rejectionReason: text("rejection_reason"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    respondedBy: text("responded_by").references(() => user.id, {
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
    index("project_suggestions_project_created_id_idx").on(
      table.projectId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("project_suggestions_project_status_created_id_idx").on(
      table.projectId,
      table.status,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("project_suggestions_author_created_id_idx").on(
      table.authorId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("project_suggestions_author_status_created_id_idx").on(
      table.authorId,
      table.status,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    check(
      "project_suggestions_content_length_check",
      sql`length(trim(${table.content})) between 10 and 2000`,
    ),
    check(
      "project_suggestions_state_details_check",
      sql`(
        (${table.status} = 'pending' and ${table.respondedAt} is null and ${table.respondedBy} is null and ${table.rejectionReason} is null and ${table.completedAt} is null and ${table.completedBy} is null)
        or (${table.status} = 'accepted' and ${table.respondedAt} is not null and ${table.rejectionReason} is null and ${table.completedAt} is null and ${table.completedBy} is null)
        or (${table.status} = 'rejected' and ${table.respondedAt} is not null and length(trim(${table.rejectionReason})) between 3 and 2000 and ${table.completedAt} is null and ${table.completedBy} is null)
        or (${table.status} = 'completed' and ${table.respondedAt} is not null and ${table.rejectionReason} is null and ${table.completedAt} is not null)
      )`,
    ),
  ],
);

export type ProjectSuggestion = typeof projectSuggestions.$inferSelect;
export type { ProjectSuggestionStatus };
