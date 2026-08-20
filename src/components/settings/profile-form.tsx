"use client";

import { useActionState } from "react";

import { updateProfileAction } from "@/actions/profile";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { useI18n } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/types/actions";

export function ProfileForm({
  username,
  contactEmail,
}: {
  username: string;
  contactEmail: string;
}) {
  const { t } = useI18n();
  const [state, action] = useActionState(
    updateProfileAction,
    initialActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">{t("Username")}</Label>
        <Input
          id="username"
          name="username"
          defaultValue={username}
          minLength={3}
          maxLength={24}
          pattern="[a-z0-9_-]+"
          required
        />
        <p className="text-xs text-muted-foreground">
          {t("Lowercase letters, numbers, underscores, and hyphens.")}
        </p>
        <FieldError errors={state.fieldErrors?.username} />
      </div>
      <div className="space-y-1.5 border-t pt-4">
        <Label htmlFor="contactEmail">{t("Contact email")}</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={contactEmail}
          maxLength={254}
          autoComplete="email"
          required
        />
        <p className="text-xs leading-5 text-muted-foreground">
          {t(
            "This email is private and used only for review and account communications.",
          )}
        </p>
        <FieldError errors={state.fieldErrors?.contactEmail} />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">{t("Save profile")}</SubmitButton>
    </form>
  );
}
