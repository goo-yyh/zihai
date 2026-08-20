import { describe, expect, it } from "vitest";

import { insertWithUniqueSlug, slugify, withSlugSuffix } from "@/lib/slug";

describe("slugify", () => {
  it("creates stable URL-safe slugs", () => {
    expect(slugify("  My AI Product!  ")).toBe("my-ai-product");
    expect(slugify("Crème Brûlée")).toBe("creme-brulee");
  });

  it("caps slug length", () => {
    expect(slugify("a".repeat(140))).toHaveLength(100);
  });
});

describe("withSlugSuffix", () => {
  it("uses deterministic suffixes and a safe fallback", () => {
    expect(withSlugSuffix("agent", 0)).toBe("agent");
    expect(withSlugSuffix("agent", 2)).toBe("agent-3");
    expect(withSlugSuffix("", 0)).toBe("project");
  });
});

describe("insertWithUniqueSlug", () => {
  it("retries inserts with deterministic suffixes after conflicts", async () => {
    const attemptedSlugs: string[] = [];
    const result = await insertWithUniqueSlug("Agent", async (slug) => {
      attemptedSlugs.push(slug);
      return slug === "agent-3" ? { id: "project-id" } : undefined;
    });

    expect(attemptedSlugs).toEqual(["agent", "agent-2", "agent-3"]);
    expect(result).toEqual({
      inserted: { id: "project-id" },
      attempts: 3,
    });
  });

  it("uses a random fallback after deterministic candidates conflict", async () => {
    const attemptedSlugs: string[] = [];
    const result = await insertWithUniqueSlug(
      "",
      async (slug) => {
        attemptedSlugs.push(slug);
        return slug === "project-deadbeef" ? slug : undefined;
      },
      () => "deadbeef",
    );

    expect(attemptedSlugs).toHaveLength(26);
    expect(attemptedSlugs.at(-1)).toBe("project-deadbeef");
    expect(result).toEqual({ inserted: "project-deadbeef", attempts: 26 });
  });
});
