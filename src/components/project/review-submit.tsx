"use client";

import { LoaderCircle, Save, Send, Trash2 } from "lucide-react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

type ReviewActionState = {
  submitting: boolean;
  setSubmitting: (value: boolean) => void;
  saving: boolean;
  setSaving: (value: boolean) => void;
};

const ReviewActionContext = createContext<ReviewActionState | null>(null);

// Guards the whole edit page while footer actions are in flight: the submit
// button shows its own loading state, and the surrounding content is made
// inert so the project cannot be edited mid-submission.
export function ReviewSubmitBarrier({
  children,
}: {
  children: React.ReactNode;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const value = useMemo(
    () => ({ submitting, setSubmitting, saving, setSaving }),
    [submitting, saving],
  );

  return (
    <ReviewActionContext.Provider value={value}>
      <div
        aria-busy={submitting || saving}
        className={
          submitting || saving ? "pointer-events-none opacity-60" : undefined
        }
      >
        {children}
      </div>
    </ReviewActionContext.Provider>
  );
}

// Form-owned actions use this to share their pending state with the footer
// buttons rendered outside the form element; it returns local fallbacks when
// the form is used outside an edit page (for example /submit).
export function useReviewActions() {
  const context = useContext(ReviewActionContext);
  const [localSaving, setLocalSaving] = useState(false);
  return {
    saving: context?.saving ?? localSaving,
    setSaving: context?.setSaving ?? setLocalSaving,
  };
}

function isRedirectError(error: unknown) {
  // redirect() from a server action surfaces as an error carrying a
  // NEXT_REDIRECT digest; it must keep propagating for navigation to happen.
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

export function SubmitReviewForm({
  action,
  canSubmit,
}: {
  action: () => Promise<void>;
  canSubmit: boolean;
}) {
  const { t } = useI18n();
  const context = useContext(ReviewActionContext);
  const busy = context?.submitting ?? false;
  const [, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        // Set outside startTransition so the loading state paints immediately.
        context?.setSubmitting(true);
        startTransition(async () => {
          try {
            await action();
            context?.setSubmitting(false);
          } catch (error) {
            if (isRedirectError(error)) {
              // The Toaster lives in the root layout, so the notification
              // survives the client-side navigation the redirect performs.
              toast.success(t("Submitted for review."));
              throw error;
            }
            context?.setSubmitting(false);
            toast.error(t("Unable to submit the project."));
          }
        });
      }}
    >
      <Button type="submit" disabled={!canSubmit || busy}>
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}{" "}
        {busy ? t("Submitting…") : t("Submit for review")}
      </Button>
    </form>
  );
}

// Delete runs behind a confirm dialog; like the submit action it redirects on
// success, so the success toast fires on the redirect error path.
export function DeleteProjectButton({
  action,
  confirmMessage,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
}) {
  const { t } = useI18n();
  const context = useContext(ReviewActionContext);
  const busy = context?.submitting ?? false;
  const [, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={busy}
      onClick={() => {
        if (busy) return;
        if (!window.confirm(t(confirmMessage))) return;
        context?.setSubmitting(true);
        startTransition(async () => {
          try {
            await action();
            context?.setSubmitting(false);
          } catch (error) {
            if (isRedirectError(error)) {
              toast.success(t("Project deleted."));
              throw error;
            }
            context?.setSubmitting(false);
            toast.error(t("Unable to delete the project."));
          }
        });
      }}
    >
      {busy ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}{" "}
      {busy ? t("Deleting…") : t("Delete")}
    </Button>
  );
}

// Submits the project form from the footer through the native form attribute;
// the pending state comes from the form itself via useReviewActions().
export function SaveProjectButton({ formId }: { formId: string }) {
  const { t } = useI18n();
  const { saving } = useReviewActions();
  return (
    <Button type="submit" form={formId} variant="outline" disabled={saving}>
      {saving ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Save className="size-4" />
      )}{" "}
      {saving ? t("Saving…") : t("Save project")}
    </Button>
  );
}
