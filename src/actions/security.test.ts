import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteBlobsBestEffort: vi.fn(),
  getDb: vi.fn(),
  redirect: vi.fn(),
  revalidateUserPresentation: vi.fn(),
  signOut: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/db", () => ({
  getDb: mocks.getDb,
  withTransaction: mocks.withTransaction,
}));
vi.mock("@/db/queries/account", () => ({
  hasCredentialAccount: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({ api: { signOut: mocks.signOut } }),
}));
vi.mock("@/lib/session", () => ({
  assertOnboardedUser: async () => ({
    user: {
      id: "owner",
      role: "user",
      username: "owner",
    },
  }),
}));
vi.mock("@/server/blob", () => ({
  deleteBlobsBestEffort: mocks.deleteBlobsBestEffort,
}));
vi.mock("@/server/cache", () => ({
  revalidateUserPresentation: mocks.revalidateUserPresentation,
}));

const { deleteAccountAction } = await import("./security");

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

describe("account deletion Blob cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue(undefined);
    mocks.deleteBlobsBestEffort.mockResolvedValue(undefined);
  });

  it("locks owned projects and cleans their final paths only after commit", async () => {
    const events: string[] = [];
    mocks.signOut.mockImplementationOnce(async () => {
      events.push("auth:signed-out");
    });
    const userQuery = queryBuilder(
      [{ role: "user", avatarPathname: "avatars/owner/avatar.png" }],
      events,
      "user",
    );
    const projectsQuery = queryBuilder(
      [
        {
          id: "01995a50-71e8-7000-8000-000000000001",
          qrCodePathname: "projects/owner/one/qr-codes/current.png",
        },
        {
          id: "01995a50-71e8-7000-8000-000000000002",
          qrCodePathname: null,
        },
      ],
      events,
      "projects",
    );
    const imagesQuery = queryBuilder(
      [
        { pathname: "projects/owner/one/screenshot.png" },
        { pathname: "projects/owner/two/screenshot.webp" },
      ],
      events,
      "images",
    );
    const select = vi
      .fn()
      .mockReturnValueOnce(userQuery)
      .mockReturnValueOnce(projectsQuery)
      .mockReturnValueOnce(imagesQuery);
    const deleteWhere = vi.fn(async () => {
      events.push("user:deleted");
    });
    const transaction = {
      execute: vi.fn(async () => {
        events.push("admin-lock:held");
      }),
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
    const formData = new FormData();
    formData.set("confirmation", "DELETE");

    await deleteAccountAction(formData);

    expect(userQuery.for).toHaveBeenCalledWith("update");
    expect(projectsQuery.for).toHaveBeenCalledWith("update");
    expect(mocks.deleteBlobsBestEffort).toHaveBeenCalledWith([
      "avatars/owner/avatar.png",
      "projects/owner/one/qr-codes/current.png",
      "projects/owner/one/screenshot.png",
      "projects/owner/two/screenshot.webp",
    ]);
    expect(events).toEqual([
      "auth:signed-out",
      "transaction:begin",
      "admin-lock:held",
      "user:locked",
      "projects:locked",
      "images:read",
      "user:deleted",
      "transaction:commit",
      "blob:cleanup",
    ]);
  });
});
