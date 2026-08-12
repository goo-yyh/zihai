"use client";

import { useActionState } from "react";

import {
  rejectIterationAction,
  rejectProjectAction,
} from "@/actions/admin";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/types/actions";

export function RejectionForm({
  kind,
  resourceId,
}: {
  kind: "project" | "iteration";
  resourceId: string;
}) {
  const serverAction = kind === "project"
    ? rejectProjectAction.bind(null, resourceId)
    : rejectIterationAction.bind(null, resourceId);
  const [state, action] = useActionState(serverAction, initialActionState);

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason for rejection</Label>
        <Textarea id="reason" name="reason" minLength={3} maxLength={2000} rows={4} placeholder="Give the builder clear, actionable feedback." required />
        <FieldError errors={state.fieldErrors?.reason} />
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="danger" pendingLabel="Rejecting…">Reject</SubmitButton>
    </form>
  );
}
