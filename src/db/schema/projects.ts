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

export const PROJECT_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const projectStatus = pgEnum("project_status", PROJECT_STATUSES);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description").notNull(),
    websiteUrl: text("website_url"),
    githubUrl: text("github_url"),
    status: projectStatus("status").default("draft").notNull(),
    rejectionReason: text("rejection_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by").references(() => user.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("projects_slug_unique").on(table.slug),
    index("projects_owner_id_idx").on(table.ownerId),
    index("projects_status_idx").on(table.status),
    index("projects_status_published_at_id_idx").on(
      table.status,
      table.publishedAt,
      table.id,
    ),
    index("projects_owner_id_updated_at_idx").on(
      table.ownerId,
      table.updatedAt,
    ),
    index("projects_created_at_idx").on(table.createdAt),
    index("projects_published_at_idx").on(table.publishedAt),
    check(
      "projects_url_required",
      sql`num_nonnulls(${table.websiteUrl}, ${table.githubUrl}) >= 1`,
    ),
  ],
);

export const projectImages = pgTable(
  "project_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
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
    index("project_images_project_id_idx").on(table.projectId),
    uniqueIndex("project_images_pathname_unique").on(table.blobPathname),
    uniqueIndex("project_images_sort_unique").on(
      table.projectId,
      table.sortOrder,
    ),
    check("project_images_size_positive", sql`${table.sizeBytes} > 0`),
  ],
);

export type Project = typeof projects.$inferSelect;
export type ProjectImage = typeof projectImages.$inferSelect;
