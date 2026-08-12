import { ArrowLeft, ArrowRight, ChevronsLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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

export function CursorPagination<T>({
  page,
  basePath,
  preservedParams = {},
}: {
  page: CursorPage<T>;
  basePath: string;
  preservedParams?: Record<string, string | undefined>;
}) {
  const firstPageHref = paginationHref(basePath, preservedParams);

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {page.items.length} result
        {page.items.length === 1 ? "" : "s"} on this page
      </p>
      <nav className="flex flex-wrap gap-2" aria-label="Pagination">
        {page.previousCursor ? (
          <Button asChild size="sm" variant="outline">
            <Link
              href={paginationHref(
                basePath,
                preservedParams,
                page.previousCursor,
              )}
            >
              <ArrowLeft className="size-4" /> Previous
            </Link>
          </Button>
        ) : page.hasCursor ? (
          <Button asChild size="sm" variant="outline">
            <Link href={firstPageHref}>
              <ChevronsLeft className="size-4" /> First page
            </Link>
          </Button>
        ) : null}
        {page.nextCursor ? (
          <Button asChild size="sm" variant="outline">
            <Link
              href={paginationHref(basePath, preservedParams, page.nextCursor)}
            >
              Next <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : null}
      </nav>
    </div>
  );
}
