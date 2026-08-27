"use client";

import {
  Check,
  CheckCircle2,
  LoaderCircle,
  MessageSquare,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  acceptProjectSuggestionAction,
  completeProjectSuggestionAction,
  rejectProjectSuggestionAction,
} from "@/actions/project-suggestion";
import type { DashboardProjectSuggestion } from "@/db/queries/project-suggestions";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { useI18n } from "@/components/i18n-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { projectSuggestionStatusLabel } from "@/lib/project-suggestion-lifecycle";
import { publicProjectPath, publicProfilePath } from "@/lib/public-routes";
import { cn, formatDate } from "@/lib/utils";
import { initialActionState } from "@/types/actions";

function OwnerSuggestionActions({
  suggestion,
}: {
  suggestion: DashboardProjectSuggestion;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [rejectState, setRejectState] = useState(initialActionState);

  async function rejectSuggestion(formData: FormData) {
    setRejectState(initialActionState);
    const result = await rejectProjectSuggestionAction(
      suggestion.id,
      initialActionState,
      formData,
    );
    if (result.status === "success") {
      setShowReject(false);
      toast.success(t(result.message || "Suggestion rejected."));
      router.refresh();
      return;
    }
    setRejectState(result);
  }

  function run(action: () => Promise<{ status: string; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.status === "success") {
        toast.success(t(result.message || "Suggestion updated."));
        router.refresh();
      } else {
        toast.error(t(result.message || "Unable to update the suggestion."));
      }
    });
  }

  if (suggestion.status === "pending") {
    return (
      <div className="mt-4 border-t pt-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() => acceptProjectSuggestionAction(suggestion.id))
            }
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {t("Accept")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => {
              setRejectState(initialActionState);
              setShowReject((visible) => !visible);
            }}
          >
            <XCircle className="size-4" /> {t("Reject")}
          </Button>
        </div>
        {showReject ? (
          <form
            action={rejectSuggestion}
            className="mt-4 space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor={`suggestion-rejection-${suggestion.id}`}>
                {t("Rejection reason")}
              </Label>
              <Textarea
                id={`suggestion-rejection-${suggestion.id}`}
                name="reason"
                minLength={3}
                maxLength={2000}
                rows={4}
                required
              />
              <FieldError errors={rejectState.fieldErrors?.reason} />
            </div>
            <FormMessage state={rejectState} />
            <div className="flex gap-2">
              <SubmitButton variant="danger" pendingLabel="Rejecting…">
                {t("Confirm rejection")}
              </SubmitButton>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowReject(false)}
              >
                {t("Cancel")}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    );
  }

  if (suggestion.status === "accepted") {
    return (
      <div className="mt-4 border-t pt-4">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => completeProjectSuggestionAction(suggestion.id))
          }
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {t("Mark completed")}
        </Button>
      </div>
    );
  }

  return null;
}

export function ProjectSuggestionList({
  items,
  view,
  focusId,
}: {
  items: DashboardProjectSuggestion[];
  view: "received" | "submitted";
  focusId?: string;
}) {
  const { locale, t } = useI18n();

  if (!items.length) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <MessageSquare className="size-7 text-primary" />
        <p className="font-bold">{t("No suggestions in this view.")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((suggestion) => {
        const projectHref =
          suggestion.projectStatus === "approved"
            ? publicProjectPath({
                id: suggestion.projectId,
                slug: suggestion.projectSlug,
              })
            : null;
        return (
          <Card
            key={suggestion.id}
            id={`suggestion-${suggestion.id}`}
            className={cn(
              "scroll-mt-24 p-5 sm:p-6",
              focusId === suggestion.id &&
                "border-primary ring-2 ring-primary/20",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {projectHref ? (
                  <Link
                    href={projectHref}
                    className="font-black hover:text-primary"
                  >
                    {suggestion.projectName}
                  </Link>
                ) : (
                  <p className="font-black">{suggestion.projectName}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Submitted {date}", {
                    date: formatDate(suggestion.createdAt, locale),
                  })}
                </p>
              </div>
              <Badge variant={suggestion.status}>
                {t(projectSuggestionStatusLabel(suggestion.status))}
              </Badge>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar
                src={
                  view === "received"
                    ? suggestion.authorImage
                    : suggestion.ownerImage
                }
                alt={
                  (view === "received"
                    ? suggestion.authorUsername
                    : suggestion.ownerUsername) || t("User")
                }
                size={30}
              />
              {view === "received" ? (
                suggestion.authorUsername ? (
                  <Link
                    href={publicProfilePath({
                      id: suggestion.authorId,
                      username: suggestion.authorUsername,
                    })}
                    className="font-bold hover:text-primary"
                  >
                    @{suggestion.authorUsername}
                  </Link>
                ) : (
                  t("Deleted user")
                )
              ) : (
                <span>
                  {t("Owner:")} @{suggestion.ownerUsername || t("Deleted user")}
                </span>
              )}
            </div>

            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6">
              {suggestion.content}
            </p>
            {suggestion.rejectionReason ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <strong>{t("Rejection reason:")}</strong>{" "}
                <span className="whitespace-pre-wrap break-words">
                  {suggestion.rejectionReason}
                </span>
              </div>
            ) : null}

            {view === "received" ? (
              <OwnerSuggestionActions suggestion={suggestion} />
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
