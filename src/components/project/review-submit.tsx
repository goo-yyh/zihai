"use client";

import { LoaderCircle, Save, Send, Trash2 } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import {
  isReviewActionBusy,
  type ProjectQrCodeRefresh,
  saveThenSubmitProject,
} from "@/components/project/review-submit-flow";
import { Button } from "@/components/ui/button";

type SaveProjectBeforeSubmit = () => Promise<boolean>;

type ReviewActionState = {
  submitting: boolean;
  setSubmitting: (value: boolean) => void;
  saving: boolean;
  setSaving: (value: boolean) => void;
  projectQrCodeRefresh: ProjectQrCodeRefresh;
  setProjectQrCodeRefresh: (value: ProjectQrCodeRefresh) => void;
  registerSaveProject: (handler: SaveProjectBeforeSubmit) => () => void;
  saveProjectBeforeSubmit: SaveProjectBeforeSubmit;
};

const ReviewActionContext = createContext<ReviewActionState | null>(null);

function ignoreSaveProjectRegistration() {
  return () => undefined;
}

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
  const [projectQrCodeRefresh, setProjectQrCodeRefresh] =
    useState<ProjectQrCodeRefresh>(null);
  const saveProjectRef = useRef<SaveProjectBeforeSubmit | null>(null);
  const registerSaveProject = useCallback(
    (handler: SaveProjectBeforeSubmit) => {
      saveProjectRef.current = handler;
      return () => {
        if (saveProjectRef.current === handler) saveProjectRef.current = null;
      };
    },
    [],
  );
  const saveProjectBeforeSubmit = useCallback(async () => {
    const handler = saveProjectRef.current;
    return handler ? handler() : false;
  }, []);
  const value = useMemo(
    () => ({
      submitting,
      setSubmitting,
      saving,
      setSaving,
      projectQrCodeRefresh,
      setProjectQrCodeRefresh,
      registerSaveProject,
      saveProjectBeforeSubmit,
    }),
    [
      projectQrCodeRefresh,
      registerSaveProject,
      saveProjectBeforeSubmit,
      submitting,
      saving,
    ],
  );
  const busy = isReviewActionBusy(submitting, saving);

  return (
    <ReviewActionContext.Provider value={value}>
      <div
        aria-busy={busy}
        inert={busy ? true : undefined}
        className={busy ? "pointer-events-none opacity-60" : undefined}
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
  const [localProjectQrCodeRefresh, setLocalProjectQrCodeRefresh] =
    useState<ProjectQrCodeRefresh>(null);
  return {
    submitting: context?.submitting ?? false,
    saving: context?.saving ?? localSaving,
    setSaving: context?.setSaving ?? setLocalSaving,
    projectQrCodeRefresh: context
      ? context.projectQrCodeRefresh
      : localProjectQrCodeRefresh,
    setProjectQrCodeRefresh:
      context?.setProjectQrCodeRefresh ?? setLocalProjectQrCodeRefresh,
    registerSaveProject:
      context?.registerSaveProject ?? ignoreSaveProjectRegistration,
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
  const busy = isReviewActionBusy(
    context?.submitting ?? false,
    context?.saving ?? false,
  );
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
            const submitted = await saveThenSubmitProject(
              async () => context?.saveProjectBeforeSubmit() ?? false,
              action,
            );
            if (!submitted) {
              context?.setSubmitting(false);
              return;
            }
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
  const busy = isReviewActionBusy(
    context?.submitting ?? false,
    context?.saving ?? false,
  );
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
  const { saving, submitting } = useReviewActions();
  return (
    <Button
      type="submit"
      form={formId}
      variant="outline"
      disabled={saving || submitting}
    >
      {saving ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Save className="size-4" />
      )}{" "}
      {saving ? t("Saving…") : t("Save project")}
    </Button>
  );
}
