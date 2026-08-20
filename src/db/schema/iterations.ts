import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { projects } from "./projects";

export const ITERATION_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
] as const;

export type IterationStatus = (typeof ITERATION_STATUSES)[number];

export const iterationStatus = pgEnum("iteration_status", ITERATION_STATUSES);

export const projectIterations = pgTable(
  "project_iterations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    versionLabel: varchar("version_label", { length: 80 }),
    description: text("description").notNull(),
    status: iterationStatus("status").default("draft").notNull(),
    rejectionReason: text("rejection_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by").references(() => user.id, {
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
    index("project_iterations_project_id_idx").on(table.projectId),
    index("project_iterations_project_id_status_approved_at_created_at_idx").on(
      table.projectId,
      table.status,
      table.approvedAt,
      table.createdAt,
    ),
    index("project_iterations_project_id_owner_id_created_at_idx").on(
      table.projectId,
      table.ownerId,
      table.createdAt,
    ),
    index("project_iterations_owner_id_idx").on(table.ownerId),
    index("project_iterations_status_idx").on(table.status),
    index("project_iterations_status_updated_at_id_idx").on(
      table.status,
      table.updatedAt,
      table.id,
    ),
    index("project_iterations_created_at_idx").on(table.createdAt),
  ],
);

export const iterationImages = pgTable(
  "iteration_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    iterationId: uuid("iteration_id")
      .notNull()
      .references(() => projectIterations.id, { onDelete: "cascade" }),
    blobUrl: text("blob_url").notNull(),
    blobPathname: text("blob_pathname").notNull(),
    mimeType: varchar("mime_type", { length: 64 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sortOrder: smallint("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("iteration_images_iteration_id_idx").on(table.iterationId),
    uniqueIndex("iteration_images_pathname_unique").on(table.blobPathname),
    uniqueIndex("iteration_images_sort_unique").on(
      table.iterationId,
      table.sortOrder,
    ),
    check("iteration_images_size_positive", sql`${table.sizeBytes} > 0`),
  ],
);

export type ProjectIteration = typeof projectIterations.$inferSelect;
export type IterationImage = typeof iterationImages.$inferSelect;
