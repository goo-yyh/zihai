import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { loadOptionalUiData } = await import("./optional-ui-data");

describe("optional UI data loading", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns successful data unchanged", async () => {
    await expect(
      loadOptionalUiData("recommendations", async () => ["project"]),
    ).resolves.toEqual({ ok: true, data: ["project"] });
  });

  it("logs failures without rejecting the page render", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(
      loadOptionalUiData("recommendations", async () => {
        throw new Error("database unavailable");
      }),
    ).resolves.toEqual({ ok: false });
    expect(consoleError).toHaveBeenCalledWith(
      "Unable to load optional UI section: recommendations",
      expect.any(Error),
    );
  });
});
