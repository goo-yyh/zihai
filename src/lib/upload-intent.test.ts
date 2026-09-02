import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    BETTER_AUTH_SECRET: "test-secret-that-is-long-enough",
  }),
}));

import {
  signUploadIntent,
  verifyUploadIntent,
  type UploadIntent,
} from "@/lib/upload-intent";

describe("project QR-code upload intents", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("round-trips the expected pathname used for compare-and-swap", () => {
    const intent: UploadIntent = {
      kind: "project-qr-code",
      userId: "user-1",
      projectId: "01995a50-71e8-7000-8000-000000000001",
      pathname:
        "projects/user-1/01995a50-71e8-7000-8000-000000000001/qr-codes/new.png",
      expectedQrCodePathname: null,
      expectedProjectUpdatedAt: "2026-09-02T00:00:00.000Z",
      contentType: "image/png",
      expiresAt: Date.now() + 60_000,
    };

    expect(verifyUploadIntent(signUploadIntent(intent))).toEqual(intent);
  });

  it("rejects a QR-code intent without an expected current pathname", () => {
    const incompleteIntent = {
      kind: "project-qr-code",
      userId: "user-1",
      projectId: "01995a50-71e8-7000-8000-000000000001",
      pathname:
        "projects/user-1/01995a50-71e8-7000-8000-000000000001/qr-codes/new.png",
      contentType: "image/png",
      expiresAt: Date.now() + 60_000,
    } as UploadIntent;

    expect(() =>
      verifyUploadIntent(signUploadIntent(incompleteIntent)),
    ).toThrow("Expected QR code state is required.");
  });
});
