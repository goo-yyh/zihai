import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

import { projectSuggestions } from "@/db/schema";
import type { PageCursor } from "@/lib/pagination";

vi.mock("server-only", () => ({}));

import { exactTimestamp, timestampCursorCondition } from "./cursor-pagination";

const boundary: PageCursor = {
  version: 1,
  direction: "previous",
  sortValue: "2026-08-27T00:00:00.123456Z",
  id: "1f2713d1-d623-492b-b060-84d4ef5ad427",
};

describe("timestamp cursor SQL", () => {
  it("formats cursor timestamps with PostgreSQL microseconds", () => {
    const query = new PgDialect().sqlToQuery(
      exactTimestamp(projectSuggestions.createdAt),
    );

    expect(query.sql).toContain("AT TIME ZONE 'UTC'");
    expect(query.sql).toContain("SS.US");
  });

  it("casts the exact cursor value back to timestamptz for comparisons", () => {
    const condition = timestampCursorCondition(
      projectSuggestions.createdAt,
      projectSuggestions.id,
      boundary,
    );
    expect(condition).toBeDefined();
    if (!condition) throw new Error("Expected a cursor condition.");

    const query = new PgDialect().sqlToQuery(condition);
    expect(query.sql).toContain("$1::timestamptz");
    expect(query.params).toContain(boundary.sortValue);
    expect(query.params).toContain(boundary.id);
  });
});
