import "server-only";

import { and, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/db";
import { account, user } from "@/db/schema";

export async function getOnboardingIdentity(userId: string) {
  const rows = await getDb()
    .select({
      email: user.email,
      emailVerified: user.emailVerified,
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
      : first.emailVerified
        ? "email"
        : providers[0] || null;

  return {
    email: first.email,
    contactEmail: first.contactEmail,
    provider,
  };
}

export async function hasCredentialAccount(userId: string) {
  const [credential] = await getDb()
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, "credential"),
        isNotNull(account.password),
      ),
    )
    .limit(1);

  return Boolean(credential);
}
