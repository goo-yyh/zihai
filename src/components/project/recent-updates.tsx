"use client";

import { History, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { ProductScreenshot } from "@/components/project/product-screenshot";
import { formatDate } from "@/lib/utils";

export type RecentUpdateItem = {
  id: string;
  versionLabel: string | null;
  description: string;
  approvedAt: string | null;
  createdAt: string;
  images: { id: string; url: string }[];
};

const PREVIEW_COUNT = 3;

export function RecentUpdates({ items }: { items: RecentUpdateItem[] }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!items.length) return null;

  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-bold">
        <History className="size-4 text-primary" /> {t("Recent updates")}
      </div>
      <ol className="mt-4 space-y-4">
        {items.slice(0, PREVIEW_COUNT).map((item) => (
          <li key={item.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-bold">
                {item.versionLabel || t("Product update")}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(item.approvedAt || item.createdAt, locale)}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </li>
        ))}
      </ol>
      {items.length > PREVIEW_COUNT ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 text-sm font-bold text-primary hover:underline"
        >
          {t("View all")}
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label={t("All updates")}
          onClick={() => setOpen(false)}
        >
          <div
            className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black tracking-tight">
                {t("All updates")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("Close")}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-6 space-y-6">
              {items.map((item, index) => (
                <article
                  key={item.id}
                  className="rounded-2xl border bg-white p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-bold text-primary">
                        {t("UPDATE")}{" "}
                        {String(items.length - index).padStart(2, "0")}
                      </p>
                      <h3 className="mt-1 text-xl font-black">
                        {item.versionLabel || t("Product update")}
                      </h3>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.approvedAt || item.createdAt, locale)}
                    </span>
                  </div>
                  {item.images.length ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {item.images.map((image, imageIndex) => (
                        <div
                          key={image.id}
                          className="relative aspect-[16/10] overflow-hidden rounded-xl border bg-muted"
                        >
                          <ProductScreenshot
                            src={image.url}
                            alt={`${item.versionLabel || t("Iteration")} ${t("Screenshot {number}", { number: imageIndex + 1 })}`}
                            sizes="(max-width: 640px) 100vw, 250px"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <MarkdownContent className="mt-5">
                    {item.description}
                  </MarkdownContent>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
