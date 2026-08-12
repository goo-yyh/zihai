import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { UserFacingError } from "@/lib/errors";

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function requireUser() {
  const current = await getSession();
  if (!current) redirect("/login");
  return current;
}

export async function requireOnboardedUser() {
  const current = await requireUser();
  if (!current.user.onboardingCompleted) redirect("/onboarding");
  return current;
}

export async function requireAdmin() {
  const current = await requireOnboardedUser();
  if (current.user.role !== "admin") redirect("/");
  return current;
}

export async function assertUser() {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) throw new UserFacingError("Unauthorized");
  return current;
}

export async function assertOnboardedUser() {
  const current = await assertUser();
  if (!current.user.onboardingCompleted) {
    throw new UserFacingError("Complete onboarding before continuing.");
  }
  return current;
}

export async function assertAdmin() {
  const current = await assertOnboardedUser();
  if (current.user.role !== "admin") throw new UserFacingError("Forbidden");
  return current;
}
