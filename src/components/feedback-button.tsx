"use client";

import { LoaderCircle, Mail, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { submitFeedbackAction } from "@/actions/feedback";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type ActionState } from "@/types/actions";

export function FeedbackButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await submitFeedbackAction(initialActionState, formData);
      if (result.status === "success") {
        toast.success(t("Thanks for your feedback!"));
        setOpen(false);
        setState(initialActionState);
        return;
      }
      setState(result);
    });
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const dialog = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("Send feedback")}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-black tracking-tight">
                {t("Send feedback")}
              </h2>
              <button
                type="button"
                aria-label={t("Close")}
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <form action={submit} className="mt-4 space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">
                {t("Tell us what could be better. Plain text only.")}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="feedback-content" className="sr-only">
                  {t("Your suggestion")}
                </Label>
                <Textarea
                  id="feedback-content"
                  name="content"
                  rows={5}
                  maxLength={2000}
                  required
                  placeholder={t("Share your suggestion…")}
                />
                <FieldError errors={state.fieldErrors?.content} />
              </div>
              <FormMessage state={state} />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : null}{" "}
                  {pending ? t("Sending…") : t("Send")}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        title={t("Send feedback")}
        onClick={() => setOpen(true)}
      >
        <Mail className="size-4" />
        <span className="sr-only">{t("Send feedback")}</span>
      </Button>
      {typeof window === "undefined" ? null : dialog}
    </>
  );
}
