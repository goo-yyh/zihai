"use client";

import { useActionState } from "react";

import {
  createIterationAction,
  updateIterationAction,
} from "@/actions/iteration";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { useI18n } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/types/actions";

export function IterationForm({
  projectId,
  iteration,
}: {
  projectId: string;
  iteration?: { id: string; versionLabel: string | null; description: string };
}) {
  const { t } = useI18n();
  const serverAction = iteration
    ? updateIterationAction.bind(null, iteration.id)
    : createIterationAction.bind(null, projectId);
  const [state, action] = useActionState(serverAction, initialActionState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="versionLabel">
          {t("Version label")}{" "}
          <span className="font-normal text-muted-foreground">
            {t("(optional)")}
          </span>
        </Label>
        <Input
          id="versionLabel"
          name="versionLabel"
          defaultValue={iteration?.versionLabel || ""}
          maxLength={80}
          placeholder={t("v1.2, August update, New onboarding…")}
        />
        <FieldError errors={state.fieldErrors?.versionLabel} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">{t("What changed?")}</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={iteration?.description}
          minLength={10}
          maxLength={4000}
          rows={9}
          placeholder={t(
            "Share the decisions, improvements, and lessons behind this iteration. Markdown is supported.",
          )}
          required
        />
        <FieldError errors={state.fieldErrors?.description} />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">
        {t(iteration ? "Save iteration" : "Create iteration")}
      </SubmitButton>
    </form>
  );
}
