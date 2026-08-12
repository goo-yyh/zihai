import { APIError } from "better-auth";
import { USERNAME_ERROR_CODES } from "better-auth/plugins";
import { describe, expect, it, vi } from "vitest";

import { safeActionError } from "@/lib/action-utils";

describe("safeActionError", () => {
  it("maps the typed Better Auth username conflict to a safe message", () => {
    const error = APIError.from(
      "BAD_REQUEST",
      USERNAME_ERROR_CODES.USERNAME_IS_ALREADY_TAKEN,
    );

    expect(safeActionError(error)).toEqual({
      status: "error",
      message: "Username already taken.",
    });
  });

  it("does not classify unrelated text as a username conflict", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      // Expected logging for an unexpected server error.
    });

    expect(
      safeActionError(
        new Error("username record exists in an unrelated provider"),
        "Safe fallback.",
      ),
    ).toEqual({ status: "error", message: "Safe fallback." });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
