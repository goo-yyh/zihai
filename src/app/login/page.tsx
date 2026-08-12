import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeReturnPath } from "@/lib/navigation";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ next }, session] = await Promise.all([searchParams, getSession()]);
  const returnTo = safeReturnPath(typeof next === "string" ? next : undefined);
  if (session) {
    redirect(session.user.onboardingCompleted ? returnTo : `/onboarding?next=${encodeURIComponent(returnTo)}`);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-lg items-center px-4 py-16">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to zihAI</CardTitle>
          <CardDescription className="mt-2">Sign in to submit, iterate, and support independent AI products.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4"><LoginForm returnTo={returnTo} /></CardContent>
      </Card>
    </div>
  );
}
