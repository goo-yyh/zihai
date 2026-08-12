"use client";

import { Code2, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ returnTo }: { returnTo: string }) {
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
      setError(result.error.message || "Sign in failed.");
      setLoading(null);
    }
  }

  async function credentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("credentials");
    setError(null);
    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.username({
      username: String(data.get("username") || ""),
      password: String(data.get("password") || ""),
      callbackURL: returnTo,
    });
    if (result.error) {
      setError("Username or password is incorrect.");
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
            <Code2 className="size-4" />
          )}
          Continue with GitHub
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
          Continue with Google
        </Button>
      </div>

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or{" "}
        <span className="h-px flex-1 bg-border" />
      </div>

      <form className="space-y-4" onSubmit={credentials}>
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {error ? (
          <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={Boolean(loading)}>
          {loading === "credentials" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : null}
          Sign in
        </Button>
      </form>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        New accounts can only be created with GitHub or Google. Username login
        becomes available after setup.
      </p>
    </div>
  );
}
