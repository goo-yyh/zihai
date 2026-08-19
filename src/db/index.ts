import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleServerless } from "drizzle-orm/neon-serverless";

import { getServerEnv } from "@/lib/env";

import { schema } from "./schema";

function createDatabase() {
  return drizzle(getServerEnv().DATABASE_URL, { schema });
}

// The neon-http driver throws at runtime on .transaction(). Removing the
// method from the public type turns misuse into a compile error; use
// withTransaction() for interactive transactions instead.
type HttpDatabase = Omit<ReturnType<typeof createDatabase>, "transaction">;

let cachedDatabase: ReturnType<typeof createDatabase> | undefined;

export function getDb(): HttpDatabase {
  cachedDatabase ??= createDatabase();
  return cachedDatabase as HttpDatabase;
}

function createTransactionDatabase() {
  return drizzleServerless(
    new Pool({ connectionString: getServerEnv().DATABASE_URL, max: 1 }),
    { schema },
  );
}

export type DbTransaction = Parameters<
  Parameters<ReturnType<typeof createTransactionDatabase>["transaction"]>[0]
>[0];

// WebSocket connections cannot outlive a serverless request, so each
// transaction creates its own single-connection pool and always closes it.
// Neon's pooler pins one backend for the whole BEGIN..COMMIT window, which
// keeps FOR UPDATE and pg_advisory_xact_lock semantics intact.
export async function withTransaction<T>(
  callback: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const database = createTransactionDatabase();
  try {
    return await database.transaction(callback);
  } finally {
    await database.$client.end();
  }
}
