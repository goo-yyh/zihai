"use client";

import { Lightbulb, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { submitIdeaAction } from "@/actions/idea";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type ActionState } from "@/types/actions";

export function IdeaButton({
  accountState,
}: {
  accountState: "guest" | "onboarding" | "ready";
}) {
  const { t } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, startTransition] = useTransition();

  function closeDialog() {
    setOpen(false);
    setState(initialActionState);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await submitIdeaAction(initialActionState, formData);
      if (result.status === "success") {
        toast.success(t("idea submitted."));
        formRef.current?.reset();
        closeDialog();
        return;
      }
      setState(result);
    });
  }

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open]);

  const dialog = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="idea-dialog-title"
          onClick={closeDialog}
        >
          <div
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Lightbulb className="size-5" />
                </div>
                <h2
                  id="idea-dialog-title"
                  className="text-xl font-black tracking-tight"
                >
                  {t("Have an idea? Let us help build it.")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t(
                    "Describe the product you wish existed. We will review it and may help turn it into a working product.",
                  )}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                aria-label={t("Close")}
                onClick={closeDialog}
                className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {accountState === "guest" ? (
              <div className="mt-6 rounded-2xl border bg-muted/40 p-5 text-center">
                <p className="text-sm leading-6 text-muted-foreground">
                  {t("Sign in to submit an idea and follow its progress.")}
                </p>
                <Button asChild className="mt-4">
                  <Link href="/login" onNavigate={closeDialog}>
                    {t("Sign in")}
                  </Link>
                </Button>
              </div>
            ) : accountState === "onboarding" ? (
              <div className="mt-6 rounded-2xl border bg-muted/40 p-5 text-center">
                <p className="text-sm leading-6 text-muted-foreground">
                  {t("Finish account setup before submitting an idea.")}
                </p>
                <Button asChild className="mt-4">
                  <Link href="/onboarding" onNavigate={closeDialog}>
                    {t("Finish setup")}
                  </Link>
                </Button>
              </div>
            ) : (
              <form ref={formRef} action={submit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="idea-title">{t("idea title")}</Label>
                  <Input
                    id="idea-title"
                    name="title"
                    minLength={3}
                    maxLength={120}
                    placeholder={t("A short name for your idea")}
                    required
                  />
                  <FieldError errors={state.fieldErrors?.title} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="idea-description">
                    {t("Describe your idea")}
                  </Label>
                  <Textarea
                    id="idea-description"
                    name="description"
                    minLength={10}
                    maxLength={4000}
                    rows={6}
                    placeholder={t("What should it do, and who would it help?")}
                    required
                  />
                  <FieldError errors={state.fieldErrors?.description} />
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
                      <Lightbulb className="size-4" />
                    )}
                    {pending ? t("Submitting…") : t("Submit idea")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        size="sm"
        variant="accent"
        className="h-8 px-2.5"
        title={t("I have an idea")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Lightbulb className="size-4" />
        <span className="hidden md:inline">{t("I have an idea")}</span>
      </Button>
      {typeof window === "undefined" ? null : dialog}
    </>
  );
}
