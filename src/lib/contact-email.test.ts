import { describe, expect, it } from "vitest";

import {
  getInitialContactEmail,
  githubFallbackEmail,
  isGithubFallbackEmail,
} from "@/lib/contact-email";
import { contactEmailSchema } from "@/lib/validations";

describe("contactEmailSchema", () => {
  it("normalizes valid contact emails", () => {
    expect(contactEmailSchema.parse("  Builder@Example.COM ")).toBe(
      "builder@example.com",
    );
  });

  it("rejects invalid contact emails", () => {
    expect(contactEmailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("OAuth contact email defaults", () => {
  it("uses a saved contact email before the OAuth email", () => {
    expect(
      getInitialContactEmail("contact@example.com", "oauth@example.com"),
    ).toBe("contact@example.com");
  });

  it("uses the provider email when no contact email is saved", () => {
    expect(getInitialContactEmail(null, "google@example.com")).toBe(
      "google@example.com",
    );
  });

  it("requires a real contact email for GitHub's internal fallback", () => {
    const fallback = githubFallbackEmail(12345);

    expect(fallback).toBe("github-12345@github.zihai.invalid");
    expect(isGithubFallbackEmail(fallback)).toBe(true);
    expect(getInitialContactEmail(null, fallback)).toBe("");
  });
});
