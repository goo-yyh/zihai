"use client";

import { useActionState, useState } from "react";

import { completeOnboardingAction } from "@/actions/onboarding";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { useI18n } from "@/components/i18n-provider";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/upload/image-uploader";
import { initialActionState } from "@/types/actions";

export function OnboardingForm({
  image,
  suggestedUsername,
  contactEmail,
  contactEmailMissing,
  identityProvider,
  returnTo,
}: {
  image?: string | null;
  suggestedUsername: string;
  contactEmail: string;
  contactEmailMissing: boolean;
  identityProvider?: string | null;
  returnTo?: string;
}) {
  const { t } = useI18n();
  const [failedAvatarSrc, setFailedAvatarSrc] = useState<string | null>(null);
  const normalizedImage = image?.trim() || null;
  const useDefaultAvatar =
    !normalizedImage || failedAvatarSrc === normalizedImage;
  const [state, action] = useActionState(
    completeOnboardingAction,
    initialActionState,
  );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={returnTo || ""} />
      <input
        type="hidden"
        name="useDefaultAvatar"
        value={String(useDefaultAvatar)}
      />
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/50 p-5 sm:flex-row sm:text-left">
        <Avatar
          src={image}
          alt={suggestedUsername || t("Avatar")}
          size={72}
          onFallback={setFailedAvatarSrc}
        />
        <div className="flex-1 text-center sm:text-left">
          <p className="font-bold">{t("Your public avatar")}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t("Use the zihAI default avatar or upload a custom image.")}
          </p>
        </div>
        <ImageUploader kind="avatar" currentCount={0} compact />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("Password")}</Label>
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
          <Label htmlFor="confirmPassword">{t("Confirm password")}</Label>
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
      <p className="text-xs leading-5 text-muted-foreground">
        {t("After setup, you can sign in with this username and password.")}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="username">{t("Username")}</Label>
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
          {t("Your profile will be /u/username.")}
        </p>
        <FieldError errors={state.fieldErrors?.username} />
      </div>
      <div className="space-y-1.5">
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
          {contactEmailMissing
            ? t(
                "GitHub did not provide an email. Add one for review and account communications.",
              )
            : identityProvider === "email"
              ? t(
                  "Using your verified email. It is private and used only for review and account communications.",
                )
              : identityProvider === "google"
                ? t(
                    "Using your Google email. It is private and used only for review and account communications.",
                  )
                : t(
                    "Using your OAuth email. It is private and used only for review and account communications.",
                  )}
        </p>
        <FieldError errors={state.fieldErrors?.contactEmail} />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Setting up your account…">
        {t("Finish setup")}
      </SubmitButton>
    </form>
  );
}
