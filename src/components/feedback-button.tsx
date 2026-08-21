"use client";

import { LoaderCircle, Mail, MessageSquareText, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { submitFeedbackAction } from "@/actions/feedback";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { initialActionState, type ActionState } from "@/types/actions";

const contactEmail = "goolvyouyou@gmail.com";

export function FeedbackButton() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await submitFeedbackAction(initialActionState, formData);
      if (result.status === "success") {
        toast.success(t("Thanks for your feedback!"));
        setFeedbackOpen(false);
        setState(initialActionState);
        return;
      }
      setState(result);
    });
  }

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!feedbackOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFeedbackOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [feedbackOpen]);

  const dialog = feedbackOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("Send feedback")}
          onClick={() => setFeedbackOpen(false)}
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
                onClick={() => setFeedbackOpen(false)}
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
                  onClick={() => setFeedbackOpen(false)}
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
      <div ref={menuRef} className="relative">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          title={t("Contact and feedback")}
          aria-label={t("Contact and feedback")}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <Mail className="size-4" />
          <span className="sr-only">{t("Contact and feedback")}</span>
        </Button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border bg-white p-1.5 shadow-xl"
          >
            <a
              href={`mailto:${contactEmail}`}
              role="menuitem"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
              onClick={() => setMenuOpen(false)}
            >
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">
                  {t("Contact email")}
                </span>
                <span className="block truncate font-semibold">
                  {contactEmail}
                </span>
              </span>
            </a>

            {session ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
                onClick={() => {
                  setMenuOpen(false);
                  setFeedbackOpen(true);
                }}
              >
                <MessageSquareText className="size-4 shrink-0 text-muted-foreground" />
                {t("Feedback and suggestions")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {typeof window === "undefined" ? null : dialog}
    </>
  );
}
