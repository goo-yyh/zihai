import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UploadIntent } from "@/lib/upload-intent";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  signUploadIntent: vi.fn((intent: unknown) => JSON.stringify(intent)),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/upload-intent", () => ({
  extensionForContentType: () => "png",
  signUploadIntent: mocks.signUploadIntent,
  verifyUploadIntent: vi.fn(),
}));

const { issueUploadIntent, validateUploadOwnership } =
  await import("./upload-policy");

function mockProjectState({
  qrCodePathname,
  updatedAt,
}: {
  qrCodePathname: string | null;
  updatedAt: string;
}) {
  const limit = vi.fn().mockResolvedValue([
    {
      id: "01995a50-71e8-7000-8000-000000000001",
      qrCodePathname,
      updatedAt: new Date(updatedAt),
    },
  ]);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  mocks.getDb.mockReturnValue({ select: vi.fn(() => ({ from })) });
}

describe("project QR-code upload policy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("signs the trusted current pathname and project version", async () => {
    mockProjectState({
      qrCodePathname: "projects/owner/project/qr-codes/current.png",
      updatedAt: "2026-09-02T00:00:00.000Z",
    });

    const issued = await issueUploadIntent(
      {
        kind: "project-qr-code",
        projectId: "01995a50-71e8-7000-8000-000000000001",
        contentType: "image/png",
      },
      { id: "owner", onboardingCompleted: true },
    );

    expect(issued.pathname).toMatch(
      /^projects\/owner\/01995a50-71e8-7000-8000-000000000001\/qr-codes\/[0-9a-f-]+\.png$/,
    );
    expect(mocks.signUploadIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedQrCodePathname: "projects/owner/project/qr-codes/current.png",
        expectedProjectUpdatedAt: "2026-09-02T00:00:00.000Z",
      }),
    );
  });

  it("rejects an ABA callback whose null pathname has a newer version", async () => {
    mockProjectState({
      qrCodePathname: null,
      updatedAt: "2026-09-02T00:00:02.000Z",
    });
    const delayedIntent: UploadIntent = {
      kind: "project-qr-code",
      userId: "owner",
      projectId: "01995a50-71e8-7000-8000-000000000001",
      pathname:
        "projects/owner/01995a50-71e8-7000-8000-000000000001/qr-codes/old.png",
      expectedQrCodePathname: null,
      expectedProjectUpdatedAt: "2026-09-02T00:00:00.000Z",
      contentType: "image/png",
      expiresAt: Date.now() + 60_000,
    };

    await expect(validateUploadOwnership(delayedIntent)).rejects.toThrow(
      "Upload intent mismatch.",
    );
  });

  it("keeps a duplicate callback idempotent after the first write", async () => {
    const pathname =
      "projects/owner/01995a50-71e8-7000-8000-000000000001/qr-codes/current.png";
    mockProjectState({
      qrCodePathname: pathname,
      updatedAt: "2026-09-02T00:00:01.000Z",
    });

    await expect(
      validateUploadOwnership({
        kind: "project-qr-code",
        userId: "owner",
        projectId: "01995a50-71e8-7000-8000-000000000001",
        pathname,
        expectedQrCodePathname: null,
        expectedProjectUpdatedAt: "2026-09-02T00:00:00.000Z",
        contentType: "image/png",
        expiresAt: Date.now() + 60_000,
      }),
    ).resolves.toBeUndefined();
  });
});
