import { Shield } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AccountMenu } from "@/components/account-menu";
import { LogoutButton } from "@/components/auth/logout-button";
import { FeedbackButton } from "@/components/feedback-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { getTranslations } from "@/lib/i18n-server";
import { getSession } from "@/lib/session";

import { Brand } from "./brand";

async function AccountNav() {
  const [session, { t }] = await Promise.all([getSession(), getTranslations()]);
  if (!session) {
    return (
      <div className="flex items-center gap-1.5">
        <FeedbackButton />
        <Button asChild size="sm">
          <Link href="/login">{t("Sign in")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <FeedbackButton />
      {session.user.onboardingCompleted ? (
        <>
          {session.user.role === "admin" ? (
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="size-8"
              title={t("Admin")}
            >
              <Link href="/admin">
                <Shield className="size-4" />
                <span className="sr-only">{t("Admin")}</span>
              </Link>
            </Button>
          ) : null}
        </>
      ) : (
        <Button asChild size="sm" variant="accent">
          <Link href="/onboarding">{t("Finish setup")}</Link>
        </Button>
      )}
      <AccountMenu
        image={session.user.image}
        label={session.user.username || session.user.name || t("Account")}
        dashboardLabel={t("Dashboard")}
        settingsLabel={t("Settings")}
        showMenu={Boolean(session.user.onboardingCompleted)}
      />
      <LogoutButton
        label={t("Sign out")}
        errorMessage={t("Unable to sign out.")}
      />
    </div>
  );
}

export async function SiteHeader() {
  const { t } = await getTranslations();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Brand />
          <p className="hidden max-w-56 border-l pl-4 text-xs leading-5 text-muted-foreground xl:block">
            {t("Share your AI products")}
          </p>
        </div>
        <nav
          aria-label={t("Main navigation")}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold"
        >
          <LanguageSwitcher />
          <Suspense
            fallback={
              <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
            }
          >
            <AccountNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
