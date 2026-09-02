import { describe, expect, it, vi } from "vitest";

import {
  isProjectQrCodeRefreshCommitted,
  isReviewActionBusy,
  resolveProjectQrCodePresence,
  saveThenSubmitProject,
} from "@/components/project/review-submit-flow";

describe("saveThenSubmitProject", () => {
  it("saves the current form before submitting it for review", async () => {
    const calls: string[] = [];
    const saved = await saveThenSubmitProject(
      async () => {
        calls.push("save");
        return true;
      },
      async () => {
        calls.push("submit");
      },
    );

    expect(saved).toBe(true);
    expect(calls).toEqual(["save", "submit"]);
  });

  it("does not submit stale data when saving fails", async () => {
    const submitProject = vi.fn<() => Promise<void>>();

    const saved = await saveThenSubmitProject(async () => false, submitProject);

    expect(saved).toBe(false);
    expect(submitProject).not.toHaveBeenCalled();
  });
});

describe("review submission state", () => {
  it("uses a persisted QR upload before refreshed server props arrive", () => {
    const pendingUpload = {
      projectId: "project-1",
      expectedUrl: "https://blob.example.com/new-qr.png",
    };
    expect(
      resolveProjectQrCodePresence("project-1", false, pendingUpload),
    ).toBe(true);
    expect(
      resolveProjectQrCodePresence("project-2", false, pendingUpload),
    ).toBe(false);
    expect(
      isProjectQrCodeRefreshCommitted(
        "project-1",
        "https://blob.example.com/old-qr.png",
        pendingUpload,
      ),
    ).toBe(false);
    expect(
      isProjectQrCodeRefreshCommitted(
        "project-1",
        "https://blob.example.com/new-qr.png",
        pendingUpload,
      ),
    ).toBe(true);
    expect(resolveProjectQrCodePresence(undefined, false, null)).toBe(false);
  });

  it("keeps a deleted QR absent until refreshed server props arrive", () => {
    const pendingDeletion = {
      projectId: "project-1",
      expectedUrl: null,
    };

    expect(
      resolveProjectQrCodePresence("project-1", true, pendingDeletion),
    ).toBe(false);
    expect(
      isProjectQrCodeRefreshCommitted(
        "project-1",
        "https://blob.example.com/old-qr.png",
        pendingDeletion,
      ),
    ).toBe(false);
    expect(
      isProjectQrCodeRefreshCommitted("project-1", null, pendingDeletion),
    ).toBe(true);
  });

  it("treats saving and submitting as equally busy", () => {
    expect(isReviewActionBusy(false, true)).toBe(true);
    expect(isReviewActionBusy(true, false)).toBe(true);
    expect(isReviewActionBusy(false, false)).toBe(false);
  });
});
