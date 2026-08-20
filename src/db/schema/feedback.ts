import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

// Suggestions submitted from the header entry by signed-in users. Plain text
// only; entries are read in the admin console and are never public content.
export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("feedback_user_id_idx").on(table.userId),
    index("feedback_created_at_idx").on(table.createdAt),
  ],
);
