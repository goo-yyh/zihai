import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UploadIntent } from "@/lib/upload-intent";

const mocks = vi.hoisted(() => ({
  deleteBlobsBestEffort: vi.fn(),
  getDb: vi.fn(),
  persistUpload: vi.fn(),
  revalidateProjectWorkspace: vi.fn(),
  revalidatePublicProject: vi.fn(),
  revalidateUserPresentation: vi.fn(),
  transactionExecute: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  getDb: mocks.getDb,
  withTransaction: mocks.withTransaction,
}));
vi.mock("@/server/blob", () => ({
  deleteBlobsBestEffort: mocks.deleteBlobsBestEffort,
}));
vi.mock("@/server/cache", () => ({
  revalidateProjectWorkspace: mocks.revalidateProjectWorkspace,
  revalidatePublicProject: mocks.revalidatePublicProject,
  revalidateUserPresentation: mocks.revalidateUserPresentation,
}));
vi.mock("@/server/upload-persistence", () => ({
  persistUpload: mocks.persistUpload,
}));

const { completeUpload } = await import("./upload-completion");

const qrIntent: UploadIntent = {
  kind: "project-qr-code",
  userId: "owner-1",
  projectId: "01995a50-71e8-7000-8000-000000000001",
  pathname:
    "projects/owner-1/01995a50-71e8-7000-8000-000000000001/qr-codes/signed.png",
  expectedQrCodePathname: null,
  expectedProjectUpdatedAt: "2026-09-02T00:00:00.000Z",
  contentType: "image/png",
  expiresAt: Date.now() + 60_000,
};

function mockReferenceLookup(
  results: [unknown[], unknown[], unknown[]] = [[], [], []],
) {
  const query = () => {
    const builder = {
      from: vi.fn(() => builder),
      where: vi.fn(() => builder),
      limit: vi.fn(() => builder),
    };
    return builder;
  };
  const batch = vi.fn().mockResolvedValue(results);
  mocks.getDb.mockReturnValue({
    select: vi.fn(query),
    batch,
  });
  return batch;
}

describe("upload completion compensation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transactionExecute.mockResolvedValue(undefined);
    mocks.withTransaction.mockImplementation(async (callback) =>
      callback({ execute: mocks.transactionExecute }),
    );
    mockReferenceLookup();
  });

  function expectPathnameMutexBeforePersistence() {
    expect(mocks.withTransaction).toHaveBeenCalledOnce();
    expect(mocks.transactionExecute).toHaveBeenCalledOnce();
    expect(mocks.transactionExecute.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.persistUpload.mock.invocationCallOrder[0]!,
    );
  }

  it("cleans only the signed pathname when the client payload mismatches", async () => {
    const events: string[] = [];
    mocks.withTransaction.mockImplementationOnce(async (callback) => {
      events.push("mutex:begin");
      try {
        const result = await callback({ execute: mocks.transactionExecute });
        events.push("mutex:commit");
        return result;
      } catch (error) {
        events.push("mutex:rollback");
        throw error;
      }
    });
    mocks.transactionExecute.mockImplementationOnce(async () => {
      events.push("mutex:locked");
    });
    mocks.persistUpload.mockImplementationOnce(async () => {
      events.push("persist:failed");
      throw new Error("pathname mismatch");
    });
    const batch = mockReferenceLookup();
    batch.mockImplementationOnce(async () => {
      events.push("references:checked");
      return [[], [], []];
    });
    mocks.deleteBlobsBestEffort.mockImplementationOnce(async () => {
      events.push("blob:deleted");
    });

    await expect(
      completeUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/victim.png",
          pathname: "projects/another-owner/victim.png",
        },
        qrIntent,
      ),
    ).rejects.toThrow("pathname mismatch");

    expect(mocks.deleteBlobsBestEffort).toHaveBeenCalledOnce();
    expect(mocks.deleteBlobsBestEffort).toHaveBeenCalledWith(qrIntent.pathname);
    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalledWith(
      "projects/another-owner/victim.png",
    );
    expect(events).toEqual([
      "mutex:begin",
      "mutex:locked",
      "persist:failed",
      "references:checked",
      "blob:deleted",
      "mutex:rollback",
    ]);
    expectPathnameMutexBeforePersistence();
  });

  it("keeps a pathname already referenced by a duplicate completion", async () => {
    mocks.persistUpload.mockRejectedValueOnce(new Error("Blob HEAD failed"));
    const batch = mockReferenceLookup([[], [], [{ id: qrIntent.projectId }]]);

    await expect(
      completeUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/signed.png",
          pathname: qrIntent.pathname,
        },
        qrIntent,
      ),
    ).rejects.toThrow("Blob HEAD failed");

    expect(batch.mock.calls[0]?.[0]).toHaveLength(3);
    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalled();
    expectPathnameMutexBeforePersistence();
  });

  it.each([
    ["avatar", [[{ id: "owner-1" }], [], []]],
    ["project image", [[], [{ id: "image-1" }], []]],
    ["project QR code", [[], [], [{ id: qrIntent.projectId }]]],
  ] as const)("keeps a pathname referenced by a %s", async (_kind, results) => {
    mocks.persistUpload.mockRejectedValueOnce(new Error("Persistence failed"));
    mockReferenceLookup(
      results.map((references) => [...references]) as [
        unknown[],
        unknown[],
        unknown[],
      ],
    );

    await expect(
      completeUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/signed.png",
          pathname: qrIntent.pathname,
        },
        qrIntent,
      ),
    ).rejects.toThrow("Persistence failed");

    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalled();
    expectPathnameMutexBeforePersistence();
  });

  it("fails safe when persisted-reference verification fails", async () => {
    const persistenceError = new Error("Ownership read failed");
    const referenceError = new Error("Reference read failed");
    mocks.persistUpload.mockRejectedValueOnce(persistenceError);
    const batch = mockReferenceLookup();
    batch.mockRejectedValueOnce(referenceError);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      completeUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/signed.png",
          pathname: qrIntent.pathname,
        },
        qrIntent,
      ),
    ).rejects.toBe(persistenceError);

    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Upload compensation reference check failed",
      referenceError,
    );
    expectPathnameMutexBeforePersistence();
    consoleError.mockRestore();
  });

  it("does not persist or compensate when the pathname lock fails", async () => {
    const lockError = new Error("Advisory lock failed");
    mocks.transactionExecute.mockRejectedValueOnce(lockError);

    await expect(
      completeUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/signed.png",
          pathname: qrIntent.pathname,
        },
        qrIntent,
      ),
    ).rejects.toBe(lockError);

    expect(mocks.persistUpload).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalled();
  });

  it("does not compensate when the mutex transaction fails after persistence", async () => {
    const transactionError = new Error("Mutex transaction commit failed");
    mocks.persistUpload.mockResolvedValueOnce({
      kind: "project-qr-code",
      projectId: qrIntent.projectId,
      projectSlug: "signed-project",
      ownerId: qrIntent.userId,
      ownerUsername: "owner",
      qrCodeUrl: "https://example.public.blob.vercel-storage.com/canonical.png",
    });
    mocks.withTransaction.mockImplementationOnce(async (callback) => {
      await callback({ execute: mocks.transactionExecute });
      throw transactionError;
    });

    await expect(
      completeUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/signed.png",
          pathname: qrIntent.pathname,
        },
        qrIntent,
      ),
    ).rejects.toBe(transactionError);

    expect(mocks.persistUpload).toHaveBeenCalledOnce();
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalled();
    expect(mocks.revalidateProjectWorkspace).not.toHaveBeenCalled();
  });

  it("does not compensate when cache refresh fails after persistence", async () => {
    const cacheError = new Error("Cache refresh failed");
    mocks.persistUpload.mockResolvedValueOnce({
      kind: "project-qr-code",
      projectId: qrIntent.projectId,
      projectSlug: "signed-project",
      ownerId: qrIntent.userId,
      ownerUsername: "owner",
      qrCodeUrl: "https://example.public.blob.vercel-storage.com/canonical.png",
    });
    mocks.revalidateProjectWorkspace.mockImplementationOnce(() => {
      throw cacheError;
    });

    await expect(
      completeUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/signed.png",
          pathname: qrIntent.pathname,
        },
        qrIntent,
      ),
    ).rejects.toBe(cacheError);

    expect(mocks.persistUpload).toHaveBeenCalledOnce();
    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalled();
    expectPathnameMutexBeforePersistence();
  });

  it("refreshes project consumers after a QR code is persisted", async () => {
    mocks.persistUpload.mockResolvedValueOnce({
      kind: "project-qr-code",
      projectId: qrIntent.projectId,
      projectSlug: "signed-project",
      ownerId: qrIntent.userId,
      ownerUsername: "owner",
      qrCodeUrl: "https://example.public.blob.vercel-storage.com/canonical.png",
    });

    await expect(
      completeUpload(
        {
          url: "https://example.public.blob.vercel-storage.com/signed.png",
          pathname: qrIntent.pathname,
        },
        qrIntent,
      ),
    ).resolves.toMatchObject({ kind: "project-qr-code" });

    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalled();
    expect(mocks.revalidateProjectWorkspace).toHaveBeenCalledWith(
      qrIntent.projectId,
    );
    expect(mocks.revalidatePublicProject).toHaveBeenCalledWith(
      { id: qrIntent.projectId, slug: "signed-project" },
      { id: qrIntent.userId, username: "owner" },
    );
    expectPathnameMutexBeforePersistence();
  });
});
