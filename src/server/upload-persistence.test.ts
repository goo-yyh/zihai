import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UploadIntent } from "@/lib/upload-intent";

const mocks = vi.hoisted(() => ({
  deleteBlobsBestEffort: vi.fn(),
  getDb: vi.fn(),
  inspectBlob: vi.fn(),
  uploadLimit: vi.fn(() => 5 * 1024 * 1024),
  validateUploadOwnership: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  getDb: mocks.getDb,
  withTransaction: mocks.withTransaction,
}));
vi.mock("@/server/blob", () => ({
  deleteBlobsBestEffort: mocks.deleteBlobsBestEffort,
  inspectBlob: mocks.inspectBlob,
  uploadLimit: mocks.uploadLimit,
}));
vi.mock("@/server/upload-policy", () => ({
  validateUploadOwnership: mocks.validateUploadOwnership,
}));

const { persistUpload } = await import("./upload-persistence");

const qrIntent: UploadIntent = {
  kind: "project-qr-code",
  userId: "owner-1",
  projectId: "01995a50-71e8-7000-8000-000000000001",
  pathname:
    "projects/owner-1/01995a50-71e8-7000-8000-000000000001/qr-codes/new.png",
  expectedQrCodePathname:
    "projects/owner-1/01995a50-71e8-7000-8000-000000000001/qr-codes/old.png",
  expectedProjectUpdatedAt: "2026-09-02T00:00:00.000Z",
  contentType: "image/png",
  expiresAt: Date.now() + 60_000,
};

function blobMetadata(pathname = qrIntent.pathname) {
  return {
    pathname,
    contentType: "image/png",
    size: 512,
    url: `https://example.public.blob.vercel-storage.com/${pathname}`,
  };
}

function mockOwnerLookup() {
  const limit = vi.fn().mockResolvedValue([{ username: "owner" }]);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  mocks.getDb.mockReturnValue({ select: vi.fn(() => ({ from })) });
}

function mockProjectTransaction(
  currentQrCodePathname: string | null,
  updatedAt = "2026-09-02T00:00:00.000Z",
) {
  const forUpdate = vi.fn().mockResolvedValue([
    {
      status: "approved",
      slug: "project",
      qrCodePathname: currentQrCodePathname,
      updatedAt: new Date(updatedAt),
    },
  ]);
  const selectWhere = vi.fn(() => ({ for: forUpdate }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where: updateWhere }));
  const transaction = {
    select: vi.fn(() => ({ from: selectFrom })),
    update: vi.fn(() => ({ set })),
  };
  mocks.withTransaction.mockImplementation(async (callback) =>
    callback(transaction),
  );
  return { forUpdate, set, transaction, updateWhere };
}

describe("completed upload persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inspectBlob.mockResolvedValue(blobMetadata());
    mocks.validateUploadOwnership.mockResolvedValue(undefined);
    mocks.deleteBlobsBestEffort.mockResolvedValue(undefined);
  });

  it("rejects metadata whose real pathname is not covered by the intent", async () => {
    mocks.inspectBlob.mockResolvedValueOnce(
      blobMetadata("projects/another-owner/victim.png"),
    );

    await expect(
      persistUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/victim.png",
          pathname: qrIntent.pathname,
        },
        qrIntent,
      ),
    ).rejects.toThrow("Uploaded file violates the image policy.");

    expect(mocks.validateUploadOwnership).toHaveBeenCalledWith(qrIntent);
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.withTransaction).not.toHaveBeenCalled();
  });

  it("observes both concurrent validation failures without a dangling rejection", async () => {
    mocks.inspectBlob.mockRejectedValueOnce(new Error("Blob HEAD failed"));
    mocks.validateUploadOwnership.mockRejectedValueOnce(
      new Error("Ownership changed"),
    );

    await expect(
      persistUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/new.png",
          pathname: qrIntent.pathname,
        },
        qrIntent,
      ),
    ).rejects.toThrow(/Blob HEAD failed|Ownership changed/);

    expect(mocks.inspectBlob).toHaveBeenCalledOnce();
    expect(mocks.validateUploadOwnership).toHaveBeenCalledOnce();
  });

  it("atomically replaces the expected QR code and cleans the old object", async () => {
    mockOwnerLookup();
    const transaction = mockProjectTransaction(
      qrIntent.expectedQrCodePathname ?? null,
    );
    const blob = {
      url: "https://example.public.blob.vercel-storage.com/new.png",
      pathname: qrIntent.pathname,
    };

    await expect(persistUpload(blob, qrIntent)).resolves.toMatchObject({
      kind: "project-qr-code",
      projectId: qrIntent.projectId,
      projectSlug: "project",
      qrCodeUrl: blobMetadata().url,
    });

    expect(transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({
        qrCodeUrl: blobMetadata().url,
        qrCodePathname: blob.pathname,
        status: "pending",
        publishedAt: null,
      }),
    );
    expect(mocks.deleteBlobsBestEffort).toHaveBeenCalledWith(
      qrIntent.expectedQrCodePathname,
    );
  });

  it("treats a duplicate callback for the current pathname as a no-op", async () => {
    mockOwnerLookup();
    const transaction = mockProjectTransaction(qrIntent.pathname);

    await persistUpload(
      {
        url: "https://example.public.blob.vercel-storage.com/new.png",
        pathname: qrIntent.pathname,
      },
      qrIntent,
    );

    expect(transaction.transaction.update).not.toHaveBeenCalled();
    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalled();
  });

  it("rejects a stale replacement before changing the stored QR code", async () => {
    mockOwnerLookup();
    const transaction = mockProjectTransaction(
      "projects/owner-1/project/qr-codes/newer.png",
    );

    await expect(
      persistUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/new.png",
          pathname: qrIntent.pathname,
        },
        qrIntent,
      ),
    ).rejects.toThrow("Upload intent mismatch.");

    expect(transaction.transaction.update).not.toHaveBeenCalled();
    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalled();
  });

  it("rejects a delayed callback after upload and delete return the path to null", async () => {
    const initialIntent: UploadIntent = {
      ...qrIntent,
      expectedQrCodePathname: null,
    };
    mockOwnerLookup();
    const transaction = mockProjectTransaction(
      null,
      "2026-09-02T00:00:02.000Z",
    );

    await expect(
      persistUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/new.png",
          pathname: initialIntent.pathname,
        },
        initialIntent,
      ),
    ).rejects.toThrow("Upload intent mismatch.");

    expect(transaction.transaction.update).not.toHaveBeenCalled();
    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalled();
  });
});
