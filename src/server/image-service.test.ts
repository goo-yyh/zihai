import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteBlobsBestEffort: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  withTransaction: mocks.withTransaction,
}));
vi.mock("@/server/blob", () => ({
  deleteBlobsBestEffort: mocks.deleteBlobsBestEffort,
}));

const { deleteOwnedProject } = await import("./image-service");

function queryBuilder<T>(rows: T[], events: string[], label: string) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    for: vi.fn(async () => {
      events.push(`${label}:locked`);
      return rows;
    }),
    then: (
      resolve: (value: T[]) => unknown,
      reject: (reason: unknown) => unknown,
    ) => {
      events.push(`${label}:read`);
      return Promise.resolve(rows).then(resolve, reject);
    },
  };
  return builder;
}

describe("owned project deletion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("locks the project, captures its final paths, and cleans after commit", async () => {
    const events: string[] = [];
    const projectQuery = queryBuilder(
      [
        {
          slug: "project",
          qrCodePathname: "projects/owner/project/qr-codes/code.png",
        },
      ],
      events,
      "project",
    );
    const imagesQuery = queryBuilder(
      [
        { pathname: "projects/owner/project/one.png" },
        { pathname: "projects/owner/project/two.webp" },
      ],
      events,
      "images",
    );
    const select = vi
      .fn()
      .mockReturnValueOnce(projectQuery)
      .mockReturnValueOnce(imagesQuery);
    const deleteWhere = vi.fn(async () => {
      events.push("project:deleted");
    });
    const transaction = {
      select,
      delete: vi.fn(() => ({ where: deleteWhere })),
    };
    mocks.withTransaction.mockImplementationOnce(async (callback) => {
      events.push("transaction:begin");
      const result = await callback(transaction);
      events.push("transaction:commit");
      return result;
    });
    mocks.deleteBlobsBestEffort.mockImplementationOnce(async () => {
      events.push("blob:cleanup");
    });

    await expect(
      deleteOwnedProject("01995a50-71e8-7000-8000-000000000001", "owner"),
    ).resolves.toEqual({
      projectId: "01995a50-71e8-7000-8000-000000000001",
      slug: "project",
    });

    expect(projectQuery.for).toHaveBeenCalledWith("update");
    expect(mocks.deleteBlobsBestEffort).toHaveBeenCalledWith([
      "projects/owner/project/one.png",
      "projects/owner/project/two.webp",
      "projects/owner/project/qr-codes/code.png",
    ]);
    expect(events).toEqual([
      "transaction:begin",
      "project:locked",
      "images:read",
      "project:deleted",
      "transaction:commit",
      "blob:cleanup",
    ]);
  });

  it("does not touch Blob storage when the database delete fails", async () => {
    mocks.withTransaction.mockRejectedValueOnce(new Error("database offline"));

    await expect(
      deleteOwnedProject("01995a50-71e8-7000-8000-000000000001", "owner"),
    ).rejects.toThrow("database offline");
    expect(mocks.deleteBlobsBestEffort).not.toHaveBeenCalled();
  });
});
