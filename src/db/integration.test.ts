import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const testUrl = process.env.DATABASE_TEST_URL ?? "";
const integrationEnabled = process.env.RUN_DB_IT === "1" && testUrl.length > 0;

function assertSafeTestDatabase() {
  const pathname = new URL(testUrl).pathname;
  if (!pathname.endsWith("_test")) {
    throw new Error(
      "DATABASE_TEST_URL must point at a database whose name ends with _test.",
    );
  }
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ DATABASE_URL: testUrl }),
}));

const { withTransaction } = await import("./index");

describe.skipIf(!integrationEnabled)("withTransaction integration", () => {
  beforeAll(() => {
    assertSafeTestDatabase();
  });

  beforeAll(async () => {
    await withTransaction(async (tx) => {
      await tx.execute(
        sql`CREATE TABLE IF NOT EXISTS it_tx_probe (value integer NOT NULL)`,
      );
      await tx.execute(sql`TRUNCATE it_tx_probe`);
      await tx.execute(sql`INSERT INTO it_tx_probe VALUES (0)`);
    });
  });

  afterAll(async () => {
    await withTransaction(async (tx) => {
      await tx.execute(sql`DROP TABLE IF EXISTS it_tx_probe`);
    });
  });

  it("rolls back every statement when the callback throws", async () => {
    await expect(
      withTransaction(async (tx) => {
        await tx.execute(sql`UPDATE it_tx_probe SET value = 99`);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    await withTransaction(async (tx) => {
      const result = await tx.execute<{ value: number }>(
        sql`SELECT value FROM it_tx_probe`,
      );
      expect(result.rows[0]?.value).toBe(0);
    });
  });

  it("holds pg_advisory_xact_lock for the whole transaction", async () => {
    const firstLock = withTransaction(async (tx) => {
      const acquired = await tx.execute<{ locked: boolean }>(
        sql`SELECT pg_try_advisory_xact_lock(918273645) AS locked`,
      );
      await tx.execute(sql`SELECT pg_sleep(0.5)`);
      return acquired.rows[0]?.locked === true;
    });
    const secondLock = withTransaction(async (tx) => {
      // Wait until the first transaction is inside its critical section.
      await tx.execute(sql`SELECT pg_sleep(0.1)`);
      const acquired = await tx.execute<{ locked: boolean }>(
        sql`SELECT pg_try_advisory_xact_lock(918273645) AS locked`,
      );
      return acquired.rows[0]?.locked === true;
    });

    expect(await Promise.all([firstLock, secondLock])).toEqual([true, false]);
  });

  it("keeps FOR UPDATE updates ordered without lost updates", async () => {
    await Promise.all([
      withTransaction(async (tx) => {
        await tx.execute(sql`SELECT pg_sleep(0.2)`);
        await tx.execute(
          sql`UPDATE it_tx_probe SET value = value + 1 WHERE ctid = (SELECT ctid FROM it_tx_probe FOR UPDATE)`,
        );
      }),
      withTransaction(async (tx) => {
        await tx.execute(
          sql`UPDATE it_tx_probe SET value = value + 1 WHERE ctid = (SELECT ctid FROM it_tx_probe FOR UPDATE)`,
        );
      }),
    ]);

    await withTransaction(async (tx) => {
      const result = await tx.execute<{ value: number }>(
        sql`SELECT value FROM it_tx_probe`,
      );
      expect(result.rows[0]?.value).toBe(2);
    });
  });
});
