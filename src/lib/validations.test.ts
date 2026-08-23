import { describe, expect, it } from "vitest";

import {
  feedbackSchema,
  ideaCompletionSchema,
  ideaSubmissionSchema,
  normalizeGithubUrl,
  passwordSchema,
  projectInputSchema,
  uploadCompletionSchema,
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

describe("passwordSchema", () => {
  it("enforces the Better Auth password length boundary", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("correct-horse").success).toBe(true);
    expect(passwordSchema.safeParse("x".repeat(129)).success).toBe(false);
  });
});

describe("projectInputSchema", () => {
  const base = {
    name: "Useful Agent",
    description: "A focused assistant that handles one job extremely well.",
  };

  it("requires at least one destination and accepts both", () => {
    expect(
      projectInputSchema.safeParse({ ...base, websiteUrl: "", githubUrl: "" })
        .success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse({
        ...base,
        websiteUrl: "https://example.com",
        githubUrl: "https://github.com/acme/useful",
      }).success,
    ).toBe(true);
  });

  it("normalizes both destinations when both are provided", () => {
    const result = projectInputSchema.parse({
      ...base,
      websiteUrl: "https://example.com/product#demo",
      githubUrl: "https://github.com/acme/useful.git?tab=readme",
    });

    expect(result.websiteUrl).toBe("https://example.com/product");
    expect(result.githubUrl).toBe("https://github.com/acme/useful");
  });

  it("returns stable messages that the UI can localize", () => {
    const result = projectInputSchema.safeParse({
      ...base,
      name: "A",
      websiteUrl: "https://example.com",
      githubUrl: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toContain(
        "Project name must be at least 2 characters.",
      );
    }
  });

  it("normalizes a website destination", () => {
    const result = projectInputSchema.parse({
      ...base,
      websiteUrl: "https://example.com/product#demo",
      githubUrl: "",
    });
    expect(result.websiteUrl).toBe("https://example.com/product");
    expect(result.githubUrl).toBeNull();
  });

  it("accepts only repository-shaped GitHub URLs", () => {
    expect(
      projectInputSchema.safeParse({
        ...base,
        websiteUrl: "",
        githubUrl: "https://github.com/acme",
      }).success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse({
        ...base,
        websiteUrl: "",
        githubUrl: "https://gitlab.com/acme/useful",
      }).success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse({
        ...base,
        websiteUrl: "",
        githubUrl: "https://github.com/acme/useful.git",
      }).success,
    ).toBe(true);
  });
});

describe("normalizeGithubUrl", () => {
  it("removes query strings, hashes, and git suffixes", () => {
    expect(
      normalizeGithubUrl("https://github.com/acme/useful.git?tab=readme#top"),
    ).toBe("https://github.com/acme/useful");
  });
});

describe("uploadCompletionSchema", () => {
  const validCompletion = {
    blob: {
      url: "https://example.public.blob.vercel-storage.com/avatars/user/avatar.png",
      pathname: "avatars/user/avatar.png",
    },
    clientPayload: "signed.upload.intent",
  };

  it("accepts a secure Blob completion payload", () => {
    expect(uploadCompletionSchema.safeParse(validCompletion).success).toBe(
      true,
    );
  });

  it("rejects insecure URLs and missing signed intents", () => {
    expect(
      uploadCompletionSchema.safeParse({
        ...validCompletion,
        blob: { ...validCompletion.blob, url: "http://example.com/avatar.png" },
      }).success,
    ).toBe(false);
    expect(
      uploadCompletionSchema.safeParse({
        ...validCompletion,
        clientPayload: "",
      }).success,
    ).toBe(false);
  });
});

describe("feedbackSchema", () => {
  it("accepts trimmed plain-text content within limits", () => {
    expect(
      feedbackSchema.safeParse({ content: "  希望增加深色模式  " }).success,
    ).toBe(true);
  });

  it("rejects empty and oversized content", () => {
    expect(feedbackSchema.safeParse({ content: "   " }).success).toBe(false);
    expect(
      feedbackSchema.safeParse({ content: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});

describe("idea schemas", () => {
  it("accepts a useful idea and trims its fields", () => {
    expect(
      ideaSubmissionSchema.parse({
        title: "  AI meeting notes  ",
        description: "  Turn recordings into clear decisions and tasks.  ",
      }),
    ).toEqual({
      title: "AI meeting notes",
      description: "Turn recordings into clear decisions and tasks.",
    });
  });

  it("rejects empty or oversized idea fields", () => {
    expect(
      ideaSubmissionSchema.safeParse({ title: "AI", description: "short" })
        .success,
    ).toBe(false);
    expect(
      ideaSubmissionSchema.safeParse({
        title: "x".repeat(121),
        description: "x".repeat(4001),
      }).success,
    ).toBe(false);
  });

  it("requires and normalizes at least one completion destination", () => {
    expect(
      ideaCompletionSchema.safeParse({ websiteUrl: "", githubUrl: "" }).success,
    ).toBe(false);
    expect(
      ideaCompletionSchema.parse({
        websiteUrl: "https://example.com/idea#demo",
        githubUrl: "https://github.com/acme/idea.git?tab=readme",
      }),
    ).toEqual({
      websiteUrl: "https://example.com/idea",
      githubUrl: "https://github.com/acme/idea",
    });
  });
});
