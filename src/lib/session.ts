import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { UserFacingError } from "@/lib/errors";

export const getSession = cache(async () => {
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
});

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
  const requestHeaders = await headers();
  const current = await getAuth().api.getSession({ headers: requestHeaders });
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
