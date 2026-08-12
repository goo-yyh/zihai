import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeReturnPath } from "@/lib/navigation";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Finish setup",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const [{ next }, session] = await Promise.all([searchParams, requireUser()]);
  const returnTo = safeReturnPath(
    typeof next === "string" ? next : "/dashboard",
  );
  if (session.user.onboardingCompleted) redirect(returnTo);

  const suggested = (
    session.user.username ||
    session.user.email.split("@")[0] ||
    "builder"
  )
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 24);

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <Card>
        <CardHeader>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
            One last step
          </p>
          <CardTitle className="mt-2 text-3xl">
            Create your builder identity
          </CardTitle>
          <CardDescription className="mt-2 leading-6">
            Choose a public username, confirm your avatar, and add a password
            for convenient username sign-in later.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <OnboardingForm
            image={session.user.image}
            suggestedUsername={suggested.length >= 3 ? suggested : "builder"}
            returnTo={returnTo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
