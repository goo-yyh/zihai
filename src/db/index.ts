import "server-only";

import { drizzle } from "drizzle-orm/neon-http";

import { getServerEnv } from "@/lib/env";

import { schema } from "./schema";

const env = getServerEnv();

export const db = drizzle(env.DATABASE_URL, { schema });
