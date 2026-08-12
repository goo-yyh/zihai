import { LayoutDashboard, LogOut, Plus, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { logoutAction } from "@/actions/profile";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

import { Brand } from "./brand";

async function AccountNav() {
  const session = await getSession();
  if (!session) {
    return (
      <Button asChild size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {session.user.onboardingCompleted ? (
        <>
          <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
            <Link href="/submit">
              <Plus className="size-4" />
              Submit
            </Link>
          </Button>
          {session.user.role === "admin" ? (
            <Button asChild size="icon" variant="ghost" className="size-8" title="Admin">
              <Link href="/admin">
                <Shield className="size-4" />
                <span className="sr-only">Admin</span>
              </Link>
            </Button>
          ) : null}
          <Button asChild size="icon" variant="ghost" className="size-8" title="Dashboard">
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" />
              <span className="sr-only">Dashboard</span>
            </Link>
          </Button>
          <Button asChild size="icon" variant="ghost" className="size-8" title="Settings">
            <Link href="/settings/profile">
              <Settings className="size-4" />
              <span className="sr-only">Settings</span>
            </Link>
          </Button>
        </>
      ) : (
        <Button asChild size="sm" variant="accent">
          <Link href="/onboarding">Finish setup</Link>
        </Button>
      )}
      <Avatar
        src={session.user.image}
        alt={session.user.username || session.user.name || "Account"}
        size={32}
        className="hidden sm:block"
      />
      <form action={logoutAction}>
        <Button size="icon" variant="ghost" className="size-8" title="Sign out">
          <LogOut className="size-4" />
          <span className="sr-only">Sign out</span>
        </Button>
      </form>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/#latest" className="hidden text-muted-foreground hover:text-foreground sm:block">
            Explore
          </Link>
          <Suspense fallback={<div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />}>
            <AccountNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
