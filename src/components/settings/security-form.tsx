"use client";

import { useActionState } from "react";

import { changePasswordAction } from "@/actions/profile";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/types/actions";

export function SecurityForm() {
  const [state, action] = useActionState(changePasswordAction, initialActionState);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        <FieldError errors={state.fieldErrors?.currentPassword} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" name="newPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required />
          <FieldError errors={state.fieldErrors?.newPassword} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required />
          <FieldError errors={state.fieldErrors?.confirmPassword} />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Updating…">Change password</SubmitButton>
    </form>
  );
}
