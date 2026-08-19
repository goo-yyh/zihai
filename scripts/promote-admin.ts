import "dotenv/config";

import { drizzle } from "drizzle-orm/neon-http";
import { eq, or } from "drizzle-orm";

import { user } from "../src/db/schema/auth";

// The package is CommonJS, so the script body must stay inside main() instead
// of using top-level await like an ESM module would.
async function main() {
  const identifier = process.argv[2]?.trim();
  const databaseUrl = process.env.DATABASE_URL;

  if (!identifier) {
    console.error("Usage: pnpm admin:promote <email-or-username>");
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const db = drizzle(databaseUrl);
  const [updated] = await db
    .update(user)
    .set({ role: "admin", updatedAt: new Date() })
    .where(
      or(
        eq(user.email, identifier.toLowerCase()),
        eq(user.username, identifier.toLowerCase()),
      ),
    )
    .returning({ email: user.email, username: user.username });

  if (!updated) {
    console.error(
      `No user found for ${identifier}. Complete OAuth sign-in first.`,
    );
    process.exit(1);
  }

  console.log(
    `Promoted ${updated.username ? `@${updated.username}` : updated.email} to admin.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
