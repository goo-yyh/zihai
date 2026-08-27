"use client";

import { LoaderCircle, MessageSquarePlus, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { submitProjectSuggestionAction } from "@/actions/project-suggestion";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ModalLayer } from "@/components/ui/modal-layer";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type ActionState } from "@/types/actions";

export function ProjectSuggestionButton({
  projectId,
  projectName,
  nextPath,
  accountState,
  isOwner,
}: {
  projectId: string;
  projectName: string;
  nextPath: string;
  accountState: "guest" | "onboarding" | "ready";
  isOwner: boolean;
}) {
  const { t } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, startTransition] = useTransition();

  const closeDialog = useCallback(() => {
    setOpen(false);
    setState(initialActionState);
  }, []);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await submitProjectSuggestionAction(
        projectId,
        initialActionState,
        formData,
      );
      if (result.status === "success") {
        formRef.current?.reset();
        closeDialog();
        toast.success(t(result.message || "Suggestion sent."));
      } else {
        setState(result);
      }
    });
  }

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        disabled={isOwner}
        title={
          isOwner
            ? t("You cannot submit a suggestion to your own project.")
            : t("Submit a suggestion")
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MessageSquarePlus className="size-4" /> {t("Submit a suggestion")}
      </Button>

      <ModalLayer
        open={open}
        onClose={closeDialog}
        triggerRef={triggerRef}
        initialFocusRef={accountState === "ready" ? textareaRef : undefined}
        titleId="project-suggestion-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="project-suggestion-title" className="text-xl font-black">
              {t("Suggest an improvement")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Share a problem or improvement for {project}.", {
                project: projectName,
              })}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("Close")}
            onClick={closeDialog}
          >
            <X className="size-4" />
          </Button>
        </div>

        {accountState === "guest" ? (
          <div className="mt-6 rounded-2xl border bg-muted/40 p-5 text-center">
            <p className="text-sm text-muted-foreground">
              {t("Sign in to submit a project suggestion.")}
            </p>
            <Button asChild className="mt-4">
              <Link
                href={`/login?next=${encodeURIComponent(nextPath)}`}
                onNavigate={closeDialog}
              >
                {t("Sign in")}
              </Link>
            </Button>
          </div>
        ) : accountState === "onboarding" ? (
          <div className="mt-6 rounded-2xl border bg-muted/40 p-5 text-center">
            <p className="text-sm text-muted-foreground">
              {t("Finish account setup before submitting a suggestion.")}
            </p>
            <Button asChild className="mt-4">
              <Link
                href={`/onboarding?next=${encodeURIComponent(nextPath)}`}
                onNavigate={closeDialog}
              >
                {t("Finish setup")}
              </Link>
            </Button>
          </div>
        ) : (
          <form ref={formRef} action={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-suggestion-content">
                {t("Your suggestion")}
              </Label>
              <Textarea
                ref={textareaRef}
                id="project-suggestion-content"
                name="content"
                minLength={10}
                maxLength={2000}
                rows={7}
                placeholder={t(
                  "Describe the issue and what you would like to see improved.",
                )}
                required
              />
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span>{t("Plain text only")}</span>
                <span>{t("10–2,000 characters")}</span>
              </div>
              <FieldError errors={state.fieldErrors?.content} />
            </div>
            <FormMessage state={state} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeDialog}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <MessageSquarePlus className="size-4" />
                )}
                {pending ? t("Sending…") : t("Send suggestion")}
              </Button>
            </div>
          </form>
        )}
      </ModalLayer>
    </>
  );
}
