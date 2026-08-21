"use client";

import { useActionState } from "react";

import { changePasswordAction, setPasswordAction } from "@/actions/security";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { useI18n } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/types/actions";

function NewPasswordFields({
  fieldErrors,
}: {
  fieldErrors?: Record<string, string[]>;
}) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">{t("New password")}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          required
        />
        <FieldError errors={fieldErrors?.newPassword} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">{t("Confirm new password")}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          required
        />
        <FieldError errors={fieldErrors?.confirmPassword} />
      </div>
    </div>
  );
}

function SetPasswordForm() {
  const [state, action] = useActionState(setPasswordAction, initialActionState);
  return (
    <form action={action} className="space-y-4">
      <NewPasswordFields fieldErrors={state.fieldErrors} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Setting password…">Set password</SubmitButton>
    </form>
  );
}

function ChangePasswordForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(
    changePasswordAction,
    initialActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">{t("Current password")}</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        <FieldError errors={state.fieldErrors?.currentPassword} />
      </div>
      <NewPasswordFields fieldErrors={state.fieldErrors} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Changing password…">
        Change password
      </SubmitButton>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  return hasPassword ? <ChangePasswordForm /> : <SetPasswordForm />;
}
