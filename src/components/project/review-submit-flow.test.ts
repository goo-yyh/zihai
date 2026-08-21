import { describe, expect, it, vi } from "vitest";

import { saveThenSubmitProject } from "@/components/project/review-submit-flow";

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
