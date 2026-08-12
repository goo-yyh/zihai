"use client";

import { useActionState } from "react";

import { completeOnboardingAction } from "@/actions/onboarding";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/upload/image-uploader";
import { initialActionState } from "@/types/actions";

export function OnboardingForm({
  image,
  suggestedUsername,
  returnTo,
}: {
  image?: string | null;
  suggestedUsername: string;
  returnTo?: string;
}) {
  const [state, action] = useActionState(
    completeOnboardingAction,
    initialActionState,
  );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={returnTo || ""} />
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/50 p-5 sm:flex-row sm:text-left">
        <Avatar src={image} alt={suggestedUsername || "Avatar"} size={72} />
        <div className="flex-1 text-center sm:text-left">
          <p className="font-bold">Your public avatar</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Keep your OAuth avatar or upload a custom image. Refresh after
            upload if the preview has not updated yet.
          </p>
        </div>
        <ImageUploader kind="avatar" currentCount={0} compact />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          defaultValue={suggestedUsername}
          minLength={3}
          maxLength={24}
          pattern="[a-z0-9_-]+"
          autoComplete="username"
          required
        />
        <p className="text-xs text-muted-foreground">
          Your profile will be /u/username.
        </p>
        <FieldError errors={state.fieldErrors?.username} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            required
          />
          <FieldError errors={state.fieldErrors?.password} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            required
          />
          <FieldError errors={state.fieldErrors?.confirmPassword} />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Setting up your account…">
        Finish setup
      </SubmitButton>
    </form>
  );
}
