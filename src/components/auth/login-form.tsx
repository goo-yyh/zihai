"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { GitHubIcon } from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function social(provider: "github" | "google") {
    setLoading(provider);
    setError(null);
    const result = await authClient.signIn.social({
      provider,
      callbackURL: returnTo,
      newUserCallbackURL: `/onboarding?next=${encodeURIComponent(returnTo)}`,
    });
    if (result.error) {
      setError(t(result.error.message || "Sign in failed."));
      setLoading(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => social("github")}
          disabled={Boolean(loading)}
        >
          {loading === "github" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <GitHubIcon className="size-4" />
          )}
          {t("Continue with GitHub")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => social("google")}
          disabled={Boolean(loading)}
        >
          {loading === "google" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <span className="grid size-4 place-items-center rounded-full bg-white text-xs font-black text-[#4285f4]">
              G
            </span>
          )}
          {t("Continue with Google")}
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800">
          {error}
        </p>
      ) : null}
      <p className="text-center text-xs leading-5 text-muted-foreground">
        {t("Sign in with GitHub or Google.")}
      </p>
    </div>
  );
}
