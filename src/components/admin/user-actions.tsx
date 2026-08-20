"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setUserBanAction, setUserRoleAction } from "@/actions/admin-user";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UserActions({
  userId,
  role,
  banned,
  isSelf,
}: {
  userId: string;
  role: string;
  banned: boolean;
  isSelf: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function run(task: () => Promise<unknown>, message: string) {
    startTransition(async () => {
      try {
        await task();
        toast.success(t(message));
        router.refresh();
      } catch (error) {
        toast.error(
          t(error instanceof Error ? error.message : "Action failed."),
        );
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
        <div>
          <p className="font-bold">{t("Administrator access")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Admins can review content and manage users.")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending || (isSelf && role === "admin")}
          onClick={() =>
            run(
              () =>
                setUserRoleAction(userId, role === "admin" ? "user" : "admin"),
              role === "admin"
                ? "Admin access removed."
                : "Admin access granted.",
            )
          }
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {t(role === "admin" ? "Remove admin" : "Make admin")}
        </Button>
      </div>
      <div className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1 space-y-1.5">
            <Label htmlFor="banReason">{t("Ban reason")}</Label>
            <Input
              id="banReason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("Required when banning")}
              disabled={banned}
            />
          </div>
          <Button
            type="button"
            variant={banned ? "outline" : "danger"}
            disabled={
              pending ||
              (isSelf && !banned) ||
              (!banned && reason.trim().length < 3)
            }
            onClick={() =>
              run(
                () => setUserBanAction(userId, !banned, reason),
                banned ? "User unbanned." : "User banned and sessions revoked.",
              )
            }
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {t(banned ? "Unban user" : "Ban user")}
          </Button>
        </div>
      </div>
    </div>
  );
}
