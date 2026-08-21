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
import { getOnboardingIdentity } from "@/db/queries/account";
import { getInitialContactEmail } from "@/lib/contact-email";
import { safeReturnPath } from "@/lib/navigation";
import { getTranslations } from "@/lib/i18n-server";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return {
    title: t("Finish setup"),
    robots: { index: false, follow: false },
  };
}

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const [{ next }, session, { t }] = await Promise.all([
    searchParams,
    requireUser(),
    getTranslations(),
  ]);
  const returnTo = safeReturnPath(
    typeof next === "string" ? next : "/dashboard",
  );
  if (session.user.onboardingCompleted) redirect(returnTo);

  const identity = await getOnboardingIdentity(session.user.id);
  const contactEmail = getInitialContactEmail(
    identity?.contactEmail,
    identity?.email || session.user.email,
  );

  const suggested = (
    session.user.username ||
    session.user.name ||
    (contactEmail ? contactEmail.split("@")[0] : "") ||
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
            {t("One last step")}
          </p>
          <CardTitle className="mt-2 text-3xl">
            {t("Create your builder identity")}
          </CardTitle>
          <CardDescription className="mt-2 leading-6">
            {t(
              "Choose a public username and password, confirm your avatar, and add a private contact email.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <OnboardingForm
            image={session.user.image}
            suggestedUsername={suggested.length >= 3 ? suggested : "builder"}
            contactEmail={contactEmail}
            contactEmailMissing={!contactEmail}
            identityProvider={identity?.provider}
            returnTo={returnTo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
