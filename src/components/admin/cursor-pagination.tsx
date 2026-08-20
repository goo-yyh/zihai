import { ArrowLeft, ArrowRight, ChevronsLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getTranslations } from "@/lib/i18n-server";
import type { CursorPage } from "@/lib/pagination";

function paginationHref(
  basePath: string,
  preservedParams: Record<string, string | undefined>,
  cursor?: string,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(preservedParams)) {
    if (value) params.set(key, value);
  }
  if (cursor) params.set("cursor", cursor);

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export async function CursorPagination<T>({
  page,
  basePath,
  preservedParams = {},
}: {
  page: CursorPage<T>;
  basePath: string;
  preservedParams?: Record<string, string | undefined>;
}) {
  const { t } = await getTranslations();
  const firstPageHref = paginationHref(basePath, preservedParams);

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {t(
          page.items.length === 1
            ? "Showing {count} result on this page"
            : "Showing {count} results on this page",
          { count: page.items.length },
        )}
      </p>
      <nav className="flex flex-wrap gap-2" aria-label={t("Pagination")}>
        {page.previousCursor ? (
          <Button asChild size="sm" variant="outline">
            <Link
              href={paginationHref(
                basePath,
                preservedParams,
                page.previousCursor,
              )}
            >
              <ArrowLeft className="size-4" /> {t("Previous")}
            </Link>
          </Button>
        ) : page.hasCursor ? (
          <Button asChild size="sm" variant="outline">
            <Link href={firstPageHref}>
              <ChevronsLeft className="size-4" /> {t("First page")}
            </Link>
          </Button>
        ) : null}
        {page.nextCursor ? (
          <Button asChild size="sm" variant="outline">
            <Link
              href={paginationHref(basePath, preservedParams, page.nextCursor)}
            >
              {t("Next")} <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : null}
      </nav>
    </div>
  );
}
