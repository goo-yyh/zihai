import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTranslations } from "@/lib/i18n-server";
import { safeReturnPath } from "@/lib/navigation";
import { getSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return {
    title: t("Create an account"),
    robots: { index: false, follow: false },
  };
}

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const [{ next }, session, { t }] = await Promise.all([
    searchParams,
    getSession(),
    getTranslations(),
  ]);
  const returnTo = safeReturnPath(typeof next === "string" ? next : undefined);

  if (session) {
    redirect(
      session.user.onboardingCompleted
        ? returnTo
        : `/onboarding?next=${encodeURIComponent(returnTo)}`,
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-lg items-center px-4 py-16">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {t("Create your zihAI account")}
          </CardTitle>
          <CardDescription className="mt-2">
            {t("Verify your email before creating your builder identity.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <RegisterForm returnTo={returnTo} />
        </CardContent>
      </Card>
    </div>
  );
}
