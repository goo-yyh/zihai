import { describe, expect, it } from "vitest";

import {
  createCursorPage,
  decodePageCursor,
  encodePageCursor,
  normalizePageSize,
} from "@/lib/pagination";

type Row = { id: string; createdAt: Date };

const rows = (ids: string[]): Row[] =>
  ids.map((id) => ({
    id,
    createdAt: new Date(`2026-08-${id.padStart(2, "0")}T00:00:00.000Z`),
  }));

describe("page cursors", () => {
  it("round-trips a valid cursor and rejects malformed input", () => {
    const cursor = {
      version: 1 as const,
      direction: "next" as const,
      sortValue: "2026-08-12T00:00:00.000Z",
      id: "resource-id",
    };

    expect(decodePageCursor(encodePageCursor(cursor))).toEqual(cursor);
    expect(decodePageCursor("not-a-cursor")).toBeNull();
    expect(decodePageCursor("x".repeat(1025))).toBeNull();
    expect(decodePageCursor(encodePageCursor(cursor), "uuid")).toBeNull();
  });

  it("creates a first page with only a next cursor", () => {
    const page = createCursorPage(
      rows(["05", "04", "03"]),
      2,
      null,
      (row) => row.createdAt,
    );

    expect(page.items.map(({ id }) => id)).toEqual(["05", "04"]);
    expect(page.previousCursor).toBeNull();
    expect(decodePageCursor(page.nextCursor)?.direction).toBe("next");
  });

  it("restores descending display order for a previous-page query", () => {
    const incoming = {
      version: 1 as const,
      direction: "previous" as const,
      sortValue: "2026-08-03T00:00:00.000Z",
      id: "03",
    };
    const page = createCursorPage(
      rows(["04", "05", "06"]),
      2,
      incoming,
      (row) => row.createdAt,
    );

    expect(page.items.map(({ id }) => id)).toEqual(["05", "04"]);
    expect(decodePageCursor(page.previousCursor)?.direction).toBe("previous");
    expect(decodePageCursor(page.nextCursor)?.direction).toBe("next");
  });

  it("bounds internal page-size requests", () => {
    expect(normalizePageSize(0)).toBe(1);
    expect(normalizePageSize(25.9)).toBe(25);
    expect(normalizePageSize(10_000)).toBe(100);
  });
});
