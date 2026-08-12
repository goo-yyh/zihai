import { describe, expect, it } from "vitest";

import { slugify, withSlugSuffix } from "@/lib/slug";

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
