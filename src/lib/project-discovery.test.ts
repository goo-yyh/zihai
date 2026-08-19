import { describe, expect, it } from "vitest";

import {
  projectDiscoveryParamsSchema,
  projectSearchPatterns,
  publicProjectPageSchema,
} from "@/lib/project-discovery";

describe("public project discovery", () => {
  it("defaults to the latest first page without a search query", () => {
    expect(projectDiscoveryParamsSchema.parse({})).toEqual({
      sort: "latest",
      query: "",
      page: 1,
    });
  });

  it("parses a combined hot search and rejects invalid bounds", () => {
    expect(
      projectDiscoveryParamsSchema.parse({
        sort: "hot",
        query: "  ai agent  ",
        page: "3",
      }),
    ).toEqual({
      sort: "hot",
      query: "ai agent",
      page: 3,
    });

    expect(
      projectDiscoveryParamsSchema.safeParse({ sort: "unknown" }).success,
    ).toBe(false);
    expect(projectDiscoveryParamsSchema.safeParse({ page: "0" }).success).toBe(
      false,
    );
    expect(
      projectDiscoveryParamsSchema.safeParse({ query: "x".repeat(101) })
        .success,
    ).toBe(false);
  });

  it("builds deduplicated literal ILIKE patterns for search terms", () => {
    expect(projectSearchPatterns(" AI   helper AI ")).toEqual([
      "%AI%",
      "%helper%",
    ]);
    expect(projectSearchPatterns("100% safe_name \\docs")).toEqual([
      "%100\\%%",
      "%safe\\_name%",
      "%\\\\docs%",
    ]);
  });

  it("requires a non-negative filtered total in project page responses", () => {
    expect(
      publicProjectPageSchema.parse({
        items: [],
        nextPage: null,
        totalCount: 0,
      }),
    ).toEqual({ items: [], nextPage: null, totalCount: 0 });

    expect(
      publicProjectPageSchema.safeParse({ items: [], nextPage: null }).success,
    ).toBe(false);
    expect(
      publicProjectPageSchema.safeParse({
        items: [],
        nextPage: null,
        totalCount: -1,
      }).success,
    ).toBe(false);
  });
});
