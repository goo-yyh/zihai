import "dotenv/config";

import {
  type DatabaseTarget,
  validateDatabaseTarget,
} from "../src/lib/database-target";

const target = process.argv[2] as DatabaseTarget | undefined;
const expectedSiteHost = process.argv[3]?.trim();

if (!target || !["preview", "production"].includes(target)) {
  throw new Error("Expected database target: preview or production.");
}
if (!expectedSiteHost) throw new Error("Expected site host is required.");

const verified = validateDatabaseTarget({
  target,
  expectedSiteHost,
  databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
  databaseUrl: process.env.DATABASE_URL,
  betterAuthUrl: process.env.BETTER_AUTH_URL,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
});

console.log(
  `Verified ${verified.target} database target: site=${verified.siteHost}, database=${verified.databaseHost}`,
);
