import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { account, user } from "@/db/schema";

export async function getOnboardingIdentity(userId: string) {
  const rows = await getDb()
    .select({
      email: user.email,
      contactEmail: user.contactEmail,
      providerId: account.providerId,
    })
    .from(user)
    .leftJoin(account, eq(account.userId, user.id))
    .where(eq(user.id, userId));

  const first = rows[0];
  if (!first) return null;

  const providers = rows.flatMap(({ providerId }) =>
    providerId ? [providerId] : [],
  );
  const provider = providers.includes("google")
    ? "google"
    : providers.includes("github")
      ? "github"
      : providers[0] || null;

  return {
    email: first.email,
    contactEmail: first.contactEmail,
    provider,
  };
}
