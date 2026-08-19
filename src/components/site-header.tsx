import { LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { logoutAction } from "@/actions/security";
import { AccountMenu } from "@/components/account-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { GitHubIcon } from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import { getTranslations } from "@/lib/i18n-server";
import { getSession } from "@/lib/session";

import { Brand } from "./brand";

async function AccountNav() {
  const [session, { t }] = await Promise.all([getSession(), getTranslations()]);
  if (!session) {
    return (
      <Button asChild size="sm">
        <Link href="/login">{t("Sign in")}</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
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
      <form action={logoutAction}>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          title={t("Sign out")}
        >
          <LogOut className="size-4" />
          <span className="sr-only">{t("Sign out")}</span>
        </Button>
      </form>
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
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="size-8 px-0 lg:w-auto lg:px-3"
          >
            <a
              href="https://github.com/goo-yyh/zihai"
              target="_blank"
              rel="noreferrer"
              title="GitHub"
            >
              <GitHubIcon className="size-4" />
              <span className="sr-only lg:not-sr-only">GitHub</span>
            </a>
          </Button>
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
