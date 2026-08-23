"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";

import { completeIdeaAction, rejectIdeaAction } from "@/actions/admin-idea";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { useI18n } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/types/actions";

export function IdeaRejectionForm({ ideaId }: { ideaId: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(
    rejectIdeaAction.bind(null, ideaId),
    initialActionState,
  );

  return (
    <form
      action={action}
      className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="idea-rejection-reason">
          {t("Reason not accepted")}
        </Label>
        <Textarea
          id="idea-rejection-reason"
          name="reason"
          minLength={3}
          maxLength={2000}
          rows={4}
          placeholder={t("Explain clearly why this idea will not be taken on.")}
          required
        />
        <FieldError errors={state.fieldErrors?.reason} />
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="danger" pendingLabel="Rejecting…">
        {t("Do not accept")}
      </SubmitButton>
    </form>
  );
}

export function IdeaCompletionForm({ ideaId }: { ideaId: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(
    completeIdeaAction.bind(null, ideaId),
    initialActionState,
  );

  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
    >
      <div>
        <p className="font-bold text-emerald-900">
          {t("Mark this idea as completed")}
        </p>
        <p className="mt-1 text-sm leading-6 text-emerald-800">
          {t("Provide a product URL, a GitHub repository, or both.")}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="idea-result-url">{t("Product URL")}</Label>
          <Input
            id="idea-result-url"
            name="websiteUrl"
            type="url"
            placeholder="https://example.com"
          />
          <FieldError errors={state.fieldErrors?.websiteUrl} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="idea-github-url">{t("GitHub URL")}</Label>
          <Input
            id="idea-github-url"
            name="githubUrl"
            type="url"
            placeholder="https://github.com/owner/repo"
          />
          <FieldError errors={state.fieldErrors?.githubUrl} />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Completing…">
        <CheckCircle2 className="size-4" /> {t("Mark completed")}
      </SubmitButton>
    </form>
  );
}
