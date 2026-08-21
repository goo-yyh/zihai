"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LogoutButton({
  label,
  errorMessage,
}: {
  label: string;
  errorMessage: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) {
      return;
    }

    setPending(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        toast.error(errorMessage);
        setPending(false);
        return;
      }

      if (pathname === "/") {
        router.refresh();
      } else {
        router.replace("/");
      }
    } catch {
      toast.error(errorMessage);
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
