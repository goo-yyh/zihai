import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => Promise<void>>,
  persistNotification: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  after: (callback: () => Promise<void>) => {
    mocks.afterCallbacks.push(callback);
  },
}));
vi.mock("@/db", () => ({
  getDb: () => ({
    insert: () => ({ values: mocks.persistNotification }),
  }),
}));

const { scheduleNotification } = await import("./notifications");

describe("best-effort notification scheduling", () => {
  beforeEach(() => {
    mocks.afterCallbacks.length = 0;
    mocks.persistNotification.mockReset();
  });

  afterEach(() => vi.restoreAllMocks());

  it("returns without performing the database insert", () => {
    expect(
      scheduleNotification({
        recipientId: "owner",
        actorId: "actor",
        type: "project_liked",
        projectId: "project",
        payload: { projectName: "Atlas", actorName: "River" },
      }),
    ).toBeUndefined();
    expect(mocks.persistNotification).not.toHaveBeenCalled();
    expect(mocks.afterCallbacks).toHaveLength(1);
  });

  it("swallows a deferred persistence failure", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.persistNotification.mockRejectedValueOnce(new Error("offline"));

    scheduleNotification({
      recipientId: "owner",
      actorId: "actor",
      type: "project_liked",
      projectId: "project",
      payload: { projectName: "Atlas", actorName: "River" },
    });

    await expect(mocks.afterCallbacks[0]?.()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      "Unable to persist best-effort notification",
      expect.objectContaining({ type: "project_liked", error: "offline" }),
    );
    consoleError.mockRestore();
  });
});
