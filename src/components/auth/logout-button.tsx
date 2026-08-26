"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const SIGN_OUT_TIMEOUT_MS = 10_000;

export function LogoutButton({
  label,
  errorMessage,
}: {
  label: string;
  errorMessage: string;
}) {
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) {
      return;
    }

    setPending(true);

    try {
      const result = await authClient.signOut({
        fetchOptions: { timeout: SIGN_OUT_TIMEOUT_MS },
      });

      if (result.error) {
        toast.error(errorMessage);
        return;
      }

      // Authentication changes must clear preserved client state. A soft
      // refresh can leave this button and the old avatar mounted indefinitely.
      window.location.replace(new URL("/", window.location.origin));
    } catch {
      toast.error(errorMessage);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-8"
      title={label}
      aria-label={label}
      aria-busy={pending}
      disabled={pending}
      onClick={logout}
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      <span className="sr-only">{label}</span>
    </Button>
  );
}
