import { describe, expect, it } from "vitest";

import {
  assertImageCount,
  assertSubmittable,
  contentEditPatch,
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
    expect(() => assertSubmittable("draft", "project")).not.toThrow();
    expect(() => assertSubmittable("rejected", "project")).not.toThrow();
    expect(() => assertSubmittable("pending", "project")).toThrow();
  });

  it("requires one to five images", () => {
    expect(() => assertImageCount(1, "Project")).not.toThrow();
    expect(() => assertImageCount(5, "Project")).not.toThrow();
    expect(() => assertImageCount(0, "Project")).toThrow();
    expect(() => assertImageCount(6, "Project")).toThrow();
  });
});
