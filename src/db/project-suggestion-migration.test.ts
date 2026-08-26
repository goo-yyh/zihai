import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../drizzle/0008_equal_venom.sql", import.meta.url),
);
const migration = readFileSync(migrationPath, "utf8");

describe("project suggestion and notification migration", () => {
  it("contains the lifecycle and self-submission database guards", () => {
    expect(migration).toContain("project_suggestions_state_details_check");
    expect(migration).toContain("project_suggestions_content_length_check");
    expect(migration).toContain("project_suggestions_submission_guard");
    expect(migration).toContain("current_project_status <> 'approved'");
    expect(migration).toContain("project_owner_id = NEW.author_id");
  });

  it("keeps notification history when projects, suggestions, or actors are deleted", () => {
    expect(migration).toContain(
      '"notifications_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null',
    );
    expect(migration).toContain(
      '"notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null',
    );
    expect(migration).toContain(
      '"notifications_suggestion_id_project_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."project_suggestions"("id") ON DELETE set null',
    );
  });

  it("adds stable pagination and unread indexes", () => {
    expect(migration).toContain("notifications_recipient_created_id_idx");
    expect(migration).toContain(
      "notifications_recipient_unread_created_id_idx",
    );
    expect(migration).toContain(
      "project_suggestions_project_status_created_id_idx",
    );
    expect(migration).toContain(
      "project_suggestions_author_status_created_id_idx",
    );
  });
});
