import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../drizzle/0009_harsh_black_tom.sql", import.meta.url),
);
const migration = readFileSync(migrationPath, "utf8");

describe("project QR-code migration", () => {
  it("stores the public URL and deletion pathname as one optional pair", () => {
    expect(migration).toContain('ADD COLUMN "qr_code_url" text');
    expect(migration).toContain('ADD COLUMN "qr_code_pathname" text');
    expect(migration).toContain("projects_qr_code_complete");
    expect(migration).toContain(
      'num_nonnulls("projects"."qr_code_url", "projects"."qr_code_pathname") in (0, 2)',
    );
    expect(migration).toContain("projects_qr_code_pathname_unique");
  });

  it("allows only drafts to omit every project destination", () => {
    expect(migration).toContain('DROP CONSTRAINT "projects_url_required"');
    expect(migration).toContain("projects_destination_required");
    expect(migration).toContain(
      '"projects"."status" = \'draft\' or num_nonnulls("projects"."website_url", "projects"."github_url", "projects"."qr_code_url") >= 1',
    );
  });
});
