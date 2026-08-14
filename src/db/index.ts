import "server-only";

import { drizzle } from "drizzle-orm/neon-http";

import { getServerEnv } from "@/lib/env";

import { schema } from "./schema";

function createDatabase() {
  return drizzle(getServerEnv().DATABASE_URL, { schema });
}

type Database = ReturnType<typeof createDatabase>;
let cachedDatabase: Database | undefined;

export function getDb() {
  cachedDatabase ??= createDatabase();
  return cachedDatabase;
}
