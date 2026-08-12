"use client";

import { useActionState } from "react";

import { updateProfileAction } from "@/actions/profile";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/types/actions";

export function ProfileForm({ username }: { username: string }) {
  const [state, action] = useActionState(
    updateProfileAction,
    initialActionState,
  );
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
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
          Lowercase letters, numbers, underscores, and hyphens.
        </p>
        <FieldError errors={state.fieldErrors?.username} />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
