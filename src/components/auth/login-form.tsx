"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { GitHubIcon } from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function beginRequest(kind: string) {
    setLoading(kind);
    setError(null);
    setNotice(null);
  }

  async function social(provider: "github" | "google") {
    beginRequest(provider);
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

  async function credentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginRequest("credentials");
    const formData = new FormData(event.currentTarget);
    const result = await authClient.signIn.username({
      username: String(formData.get("username") || ""),
      password: String(formData.get("password") || ""),
      callbackURL: returnTo,
    });
    if (result.error) {
      setError(t("Username or password is incorrect."));
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

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> {t("or")}{" "}
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="rounded-2xl border px-4 py-3">
        <p className="text-sm font-bold">
          {t("Sign in with username and password")}
        </p>
        <form className="mt-4 space-y-3" onSubmit={credentials}>
          <div className="space-y-1.5">
            <Label htmlFor="loginUsername">{t("Username")}</Label>
            <Input
              id="loginUsername"
              name="username"
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loginPassword">{t("Password")}</Label>
            <Input
              id="loginPassword"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={Boolean(loading)}>
            {loading === "credentials" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {t("Sign in")}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("Don't have an account?")}{" "}
        <Link
          href={`/register?next=${encodeURIComponent(returnTo)}`}
          className="font-bold text-foreground underline-offset-4 hover:underline"
        >
          {t("Create an account")}
        </Link>
      </p>

      {notice ? (
        <p
          className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
          aria-live="polite"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
