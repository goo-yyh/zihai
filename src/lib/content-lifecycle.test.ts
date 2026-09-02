import { describe, expect, it } from "vitest";

import {
  assertImageCount,
  assertProjectDestination,
  assertProjectDestinationForStatus,
  assertSubmittable,
  contentEditPatch,
  hasProjectDestination,
} from "@/lib/content-lifecycle";

describe("contentEditPatch", () => {
  const now = new Date("2026-08-12T00:00:00.000Z");

  it.each(["approved", "pending"] as const)(
    "queues %s content for review",
    (status) => {
      expect(contentEditPatch(status, now)).toMatchObject({
        status: "pending",
        submittedAt: now,
        approvedAt: null,
        approvedBy: null,
      });
    },
  );

  it("returns rejected content to a clean draft", () => {
    expect(contentEditPatch("rejected", now)).toMatchObject({
      status: "draft",
      rejectionReason: null,
      submittedAt: null,
    });
  });

  it("keeps draft content as a draft", () => {
    expect(contentEditPatch("draft", now).status).toBe("draft");
  });
});

describe("submission invariants", () => {
  it("accepts only draft and rejected content", () => {
    expect(() => assertSubmittable("draft")).not.toThrow();
    expect(() => assertSubmittable("rejected")).not.toThrow();
    expect(() => assertSubmittable("pending")).toThrow();
  });

  it("requires one to five images", () => {
    expect(() => assertImageCount(1)).not.toThrow();
    expect(() => assertImageCount(5)).not.toThrow();
    expect(() => assertImageCount(0)).toThrow();
    expect(() => assertImageCount(6)).toThrow();
  });

  it("accepts a website, GitHub repository, or QR code as a destination", () => {
    const empty = { websiteUrl: null, githubUrl: null, qrCodeUrl: null };
    expect(hasProjectDestination(empty)).toBe(false);
    expect(() => assertProjectDestination(empty)).toThrow(
      "Provide a Website URL, a GitHub URL, or a QR code.",
    );

    for (const destination of [
      { ...empty, websiteUrl: "https://example.com" },
      { ...empty, githubUrl: "https://github.com/acme/project" },
      { ...empty, qrCodeUrl: "https://blob.example.com/project-qr.png" },
    ]) {
      expect(hasProjectDestination(destination)).toBe(true);
      expect(() => assertProjectDestination(destination)).not.toThrow();
    }
  });

  it("allows only drafts to remain temporarily without a destination", () => {
    const empty = { websiteUrl: null, githubUrl: null, qrCodeUrl: null };
    expect(() =>
      assertProjectDestinationForStatus("draft", empty),
    ).not.toThrow();

    for (const status of [
      "pending",
      "approved",
      "rejected",
      "archived",
    ] as const) {
      expect(() => assertProjectDestinationForStatus(status, empty)).toThrow();
    }
  });
});
