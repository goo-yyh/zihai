import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { UserFacingError } from "@/lib/errors";

async function readSession(disableCookieCache = false) {
  const requestHeaders = await headers();
  return getAuth().api.getSession({
    headers: requestHeaders,
    ...(disableCookieCache
      ? { query: { disableCookieCache: true } }
      : undefined),
  });
}

export const getSession = cache(() => readSession());
const getFreshSession = cache(() => readSession(true));

export async function refreshSessionCookieCache() {
  return readSession(true);
}

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
  const current = await getFreshSession();
  if (!current) redirect("/login");
  if (!current.user.onboardingCompleted) redirect("/onboarding");
  if (current.user.role !== "admin") redirect("/");
  return current;
}

export async function assertUser() {
  const current = await readSession();
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
  const current = await getFreshSession();
  if (!current) throw new UserFacingError("Unauthorized");
  if (!current.user.onboardingCompleted) {
    throw new UserFacingError("Complete onboarding before continuing.");
  }
  if (current.user.role !== "admin") throw new UserFacingError("Forbidden");
  return current;
}
