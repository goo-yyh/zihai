"use client";

import {
  Archive,
  CheckCircle2,
  Heart,
  LoaderCircle,
  MessageSquareText,
  Rocket,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { type RefObject, useEffect, useRef } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { ModalLayer } from "@/components/ui/modal-layer";
import {
  notificationMessage,
  notificationTarget,
  type NotificationListItem,
  type NotificationPage,
  type NotificationType,
} from "@/lib/notifications";
import { cn, formatDate } from "@/lib/utils";

function NotificationIcon({ type }: { type: NotificationType }) {
  const className = "size-4";
  switch (type) {
    case "project_liked":
      return <Heart className={className} />;
    case "project_suggestion_received":
    case "project_suggestion_accepted":
    case "project_suggestion_rejected":
    case "project_suggestion_completed":
      return <MessageSquareText className={className} />;
    case "project_approved":
    case "project_republished":
      return <Rocket className={className} />;
    case "project_rejected":
      return <XCircle className={className} />;
    case "project_archived":
      return <Archive className={className} />;
  }
}

function NotificationRow({
  item,
  onNavigate,
}: {
  item: NotificationListItem;
  onNavigate: () => void;
}) {
  const { locale, t } = useI18n();
  const copy = notificationMessage(item.type, {
    ...item.payload,
    actorName: item.actorId ? item.payload.actorName : undefined,
  });
  const target = notificationTarget(
    item.type,
    item.projectId,
    item.suggestionId,
  );
  const content = (
    <div className="flex gap-3">
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
          item.type === "project_liked"
            ? "bg-rose-100 text-rose-700"
            : "bg-primary/10 text-primary",
        )}
      >
        <NotificationIcon type={item.type} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-6">
          {t(copy.message, copy.values)}
        </p>
        {item.payload.suggestionExcerpt ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {item.payload.suggestionExcerpt}
          </p>
        ) : null}
        {item.payload.rejectionReason ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-rose-700">
            {t("Reason:")} {item.payload.rejectionReason}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatDate(new Date(item.createdAt), locale)}
        </p>
      </div>
    </div>
  );

  return target ? (
    <Link
      href={target}
      onNavigate={onNavigate}
      className="block rounded-2xl border p-4 transition hover:border-primary/40 hover:bg-muted/30"
    >
      {content}
    </Link>
  ) : (
    <div className="rounded-2xl border p-4 opacity-80">{content}</div>
  );
}

export function NotificationDrawer({
  open,
  onClose,
  triggerRef,
  page,
  loading,
  loadingMore,
  error,
  onRetry,
  onLoadMore,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  page: NotificationPage | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  onRetry: () => void;
  onLoadMore: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinelRef.current;
    if (
      !open ||
      !target ||
      !page?.nextCursor ||
      loading ||
      loadingMore ||
      error
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void onLoadMore();
      },
      {
        root: target.closest('[role="dialog"]'),
        rootMargin: "240px 0px",
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [error, loading, loadingMore, onLoadMore, open, page?.nextCursor]);

  return (
    <ModalLayer
      open={open}
      onClose={onClose}
      triggerRef={triggerRef}
      titleId="notifications-title"
      placement="right"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="notifications-title" className="text-xl font-black">
            {t("Notifications")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Opening this list marks all current notifications as read.")}
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

      <div className="mt-6 min-h-48">
        {loading && !page ? (
          <div className="flex min-h-48 items-center justify-center text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" />
            <span className="ml-2 text-sm">{t("Loading notifications…")}</span>
          </div>
        ) : error && !page ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-800">
            <p>{t(error)}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={onRetry}
            >
              {t("Try again")}
            </Button>
          </div>
        ) : page?.items.length ? (
          <div className="space-y-3">
            {page.items.map((item) => (
              <NotificationRow key={item.id} item={item} onNavigate={onClose} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
            <CheckCircle2 className="size-7" />
            <p className="mt-2 text-sm font-semibold">
              {t("No notifications yet.")}
            </p>
          </div>
        )}
      </div>

      {page && error ? (
        <div
          className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-800"
          role="alert"
        >
          <p>{t(error)}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loadingMore}
            onClick={() => void onLoadMore()}
          >
            {t("Try again")}
          </Button>
        </div>
      ) : null}

      {page?.items.length ? (
        <div
          ref={sentinelRef}
          className="flex min-h-16 items-center justify-center"
        >
          {loadingMore ? (
            <span
              className="inline-flex items-center gap-2 text-sm text-muted-foreground"
              role="status"
            >
              <LoaderCircle className="size-4 animate-spin" />
              {t("Loading more notifications…")}
            </span>
          ) : null}
          {!loading && !loadingMore && !error && !page.nextCursor ? (
            <span className="text-xs text-muted-foreground">
              {t("All notifications are loaded.")}
            </span>
          ) : null}
        </div>
      ) : null}
    </ModalLayer>
  );
}
