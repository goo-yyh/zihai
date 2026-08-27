"use client";

import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  MessageSquare,
  X,
} from "lucide-react";
import { type RefObject, useCallback, useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalLayer } from "@/components/ui/modal-layer";
import {
  projectSuggestionStatusLabel,
  PROJECT_SUGGESTION_STATUSES,
  type ProjectSuggestionStatus,
} from "@/lib/project-suggestion-lifecycle";
import { formatDate } from "@/lib/utils";

export type PublicSuggestionItem = {
  id: string;
  content: string;
  status: ProjectSuggestionStatus;
  rejectionReason: string | null;
  createdAt: string;
  respondedAt: string | null;
  completedAt: string | null;
  author: {
    id: string;
    username: string | null;
    image: string | null;
  };
};

type PublicSuggestionPage = {
  items: PublicSuggestionItem[];
  previousCursor: string | null;
  nextCursor: string | null;
};

const filters = ["all", ...PROJECT_SUGGESTION_STATUSES] as const;

export function ProjectSuggestionsDrawer({
  projectId,
  open,
  onClose,
  triggerRef,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
}) {
  const { locale, t } = useI18n();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [page, setPage] = useState<PublicSuggestionPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (status: (typeof filters)[number], cursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ status, limit: "10" });
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(
          `/api/projects/${projectId}/suggestions?${params.toString()}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as
          PublicSuggestionPage | { error?: string };
        if (!response.ok || !("items" in payload)) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Unable to load suggestions.",
          );
        }
        setPage(payload);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load suggestions.",
        );
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void loadPage(filter), 0);
    return () => window.clearTimeout(timer);
  }, [filter, loadPage, open]);

  return (
    <ModalLayer
      open={open}
      onClose={onClose}
      triggerRef={triggerRef}
      titleId="public-suggestions-title"
      placement="right"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="public-suggestions-title" className="text-xl font-black">
            {t("Project suggestions")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Public feedback and the project owner's response.")}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={t("Close")}
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {filters.map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={filter === status ? "default" : "outline"}
            onClick={() => {
              setPage(null);
              setFilter(status);
            }}
          >
            {t(status === "all" ? "All" : projectSuggestionStatusLabel(status))}
          </Button>
        ))}
      </nav>

      <div className="mt-5 min-h-48">
        {loading && !page ? (
          <div className="flex min-h-48 items-center justify-center text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" />
            <span className="ml-2 text-sm">{t("Loading suggestions…")}</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p>{t(error)}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => void loadPage(filter)}
            >
              {t("Try again")}
            </Button>
          </div>
        ) : page?.items.length ? (
          <ul className="space-y-4">
            {page.items.map((suggestion) => (
              <li key={suggestion.id} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar
                      src={suggestion.author.image}
                      alt={suggestion.author.username || t("User")}
                      size={32}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        @{suggestion.author.username || t("Deleted user")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(new Date(suggestion.createdAt), locale)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={suggestion.status}>
                    {t(projectSuggestionStatusLabel(suggestion.status))}
                  </Badge>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                  {suggestion.content}
                </p>
                {suggestion.rejectionReason ? (
                  <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
                    <strong>{t("Rejection reason:")}</strong>{" "}
                    <span className="whitespace-pre-wrap break-words">
                      {suggestion.rejectionReason}
                    </span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
            <MessageSquare className="size-6" />
            <p className="mt-2 text-sm font-semibold">
              {t("No suggestions in this view.")}
            </p>
          </div>
        )}
      </div>

      {page ? (
        <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {t(
              page.items.length === 1
                ? "Showing {count} result on this page"
                : "Showing {count} results on this page",
              { count: page.items.length },
            )}
          </p>
          <nav aria-label={t("Pagination")} className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!page.previousCursor || loading}
              onClick={() =>
                page.previousCursor
                  ? void loadPage(filter, page.previousCursor)
                  : undefined
              }
            >
              <ArrowLeft className="size-4" /> {t("Previous")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!page.nextCursor || loading}
              onClick={() =>
                page.nextCursor
                  ? void loadPage(filter, page.nextCursor)
                  : undefined
              }
            >
              {t("Next")} <ArrowRight className="size-4" />
            </Button>
          </nav>
        </div>
      ) : null}
    </ModalLayer>
  );
}
