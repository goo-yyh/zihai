import { describe, expect, it } from "vitest";

import {
  normalizeGithubUrl,
  projectInputSchema,
  usernameSchema,
} from "@/lib/validations";

describe("usernameSchema", () => {
  it("normalizes valid usernames", () => {
    expect(usernameSchema.parse("  Builder_42 ")).toBe("builder_42");
  });

  it("rejects reserved and unsafe usernames", () => {
    expect(usernameSchema.safeParse("admin").success).toBe(false);
    expect(usernameSchema.safeParse("hello world").success).toBe(false);
    expect(usernameSchema.safeParse("ab").success).toBe(false);
  });
});

describe("projectInputSchema", () => {
  const base = {
    name: "Useful Agent",
    description: "A focused assistant that handles one job extremely well.",
  };

  it("requires exactly one destination", () => {
    expect(projectInputSchema.safeParse({ ...base, websiteUrl: "", githubUrl: "" }).success).toBe(false);
    expect(projectInputSchema.safeParse({ ...base, websiteUrl: "https://example.com", githubUrl: "https://github.com/acme/useful" }).success).toBe(false);
  });

  it("normalizes a website destination", () => {
    const result = projectInputSchema.parse({ ...base, websiteUrl: "https://example.com/product#demo", githubUrl: "" });
    expect(result.websiteUrl).toBe("https://example.com/product");
    expect(result.githubUrl).toBeNull();
  });

  it("accepts only repository-shaped GitHub URLs", () => {
    expect(projectInputSchema.safeParse({ ...base, websiteUrl: "", githubUrl: "https://github.com/acme" }).success).toBe(false);
    expect(projectInputSchema.safeParse({ ...base, websiteUrl: "", githubUrl: "https://gitlab.com/acme/useful" }).success).toBe(false);
    expect(projectInputSchema.safeParse({ ...base, websiteUrl: "", githubUrl: "https://github.com/acme/useful.git" }).success).toBe(true);
  });
});

describe("normalizeGithubUrl", () => {
  it("removes query strings, hashes, and git suffixes", () => {
    expect(normalizeGithubUrl("https://github.com/acme/useful.git?tab=readme#top")).toBe("https://github.com/acme/useful");
  });
});
