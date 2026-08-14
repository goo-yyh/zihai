import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  drizzle: vi.fn(() => ({ kind: "database" })),
  getServerEnv: vi.fn(() => ({
    DATABASE_URL: "postgresql://user:password@localhost:5432/zihai",
  })),
}));

vi.mock("server-only", () => ({}));
vi.mock("drizzle-orm/neon-http", () => ({ drizzle: mocks.drizzle }));
vi.mock("@/lib/env", () => ({ getServerEnv: mocks.getServerEnv }));

import { getDb } from "./index";

describe("getDb", () => {
  it("initializes the database only on first use", () => {
    expect(mocks.getServerEnv).not.toHaveBeenCalled();
    expect(mocks.drizzle).not.toHaveBeenCalled();

    const database = getDb();

    expect(database).toEqual({ kind: "database" });
    expect(getDb()).toBe(database);
    expect(mocks.getServerEnv).toHaveBeenCalledTimes(1);
    expect(mocks.drizzle).toHaveBeenCalledTimes(1);
  });
});
