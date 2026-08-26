"use client";

import { Bell, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { openNotificationsAction } from "@/actions/notification";
import { NotificationDrawer } from "@/components/notifications/notification-drawer";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  mergeNotificationItems,
  notificationBadgeLabel,
  type NotificationPage,
} from "@/lib/notifications";

export function NotificationButton() {
  const { t } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openedRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState<NotificationPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, startTransition] = useTransition();
  const badge = notificationBadgeLabel(unreadCount);
  const closeDrawer = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/notifications/unread-count", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (
          !openedRef.current &&
          payload &&
          typeof payload === "object" &&
          "count" in payload &&
          typeof payload.count === "number"
        ) {
          setUnreadCount(payload.count);
        }
      })
      .catch(() => {
        // The badge is optional and must never disturb the rest of the header.
      });
    return () => controller.abort();
  }, []);

  function openDrawer() {
    openedRef.current = true;
    setOpen(true);
    setPage(null);
    setError(null);
    startTransition(async () => {
      const result = await openNotificationsAction();
      if (result.status === "success") {
        setPage(result.page);
        setUnreadCount(0);
      } else {
        setError(result.message);
        toast.error(t(result.message));
      }
    });
  }

  const loadMore = useCallback(async () => {
    const cursor = page?.nextCursor;
    if (!cursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams({ cursor, limit: "20" });
      const response = await fetch(`/api/notifications?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as
        NotificationPage | { error?: string };
      if (!response.ok || !("items" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Unable to load notifications.",
        );
      }
      setPage((currentPage) =>
        currentPage
          ? {
              items: mergeNotificationItems(currentPage.items, payload.items),
              previousCursor: currentPage.previousCursor,
              nextCursor: payload.nextCursor,
            }
          : payload,
      );
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load notifications.";
      setError(message);
      toast.error(t(message));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [page?.nextCursor, t]);

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        size="icon"
        variant="ghost"
        className="relative size-8"
        aria-label={t("Notifications")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openDrawer}
      >
        {pending && !open ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Bell className="size-4" />
        )}
        {badge ? (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-danger px-1 text-center text-[10px] font-black leading-5 text-white">
            {badge}
          </span>
        ) : null}
      </Button>
      <NotificationDrawer
        open={open}
        onClose={closeDrawer}
        triggerRef={triggerRef}
        page={page}
        loading={pending}
        loadingMore={loadingMore}
        error={error}
        onRetry={openDrawer}
        onLoadMore={loadMore}
      />
    </>
  );
}
