"use client";

import { Boxes, LoaderCircle, RefreshCw, Search, SearchX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { ProjectCard } from "@/components/project/project-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  MAX_PUBLIC_PROJECT_SEARCH_LENGTH,
  publicProjectPageSchema,
} from "@/lib/project-discovery";
import type { PublicProjectPage, PublicProjectSort } from "@/types/projects";

async function requestProjectPage(
  sort: PublicProjectSort,
  query: string,
  page: number,
) {
  const params = new URLSearchParams({ sort, page: String(page) });
  if (query) params.set("q", query);

  const response = await fetch("/api/projects?" + params.toString(), {
    cache: "default",
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Unable to load projects.";
    throw new Error(message);
  }

  const parsed = publicProjectPageSchema.safeParse(payload);
  if (!parsed.success) throw new Error("Unable to load projects.");
  return parsed.data;
}

function replaceDiscoveryUrl(sort: PublicProjectSort, query: string) {
  const params = new URLSearchParams();
  if (sort !== "latest") params.set("sort", sort);
  if (query) params.set("q", query);
  const search = params.toString();
  window.history.replaceState(null, "", search ? "/?" + search : "/");
}

export function ProjectDiscovery({
  initialPage,
  initialSort,
  initialQuery,
}: {
  initialPage: PublicProjectPage;
  initialSort: PublicProjectSort;
  initialQuery: string;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState(initialPage.items);
  const [nextPage, setNextPage] = useState(initialPage.nextPage);
  const [totalCount, setTotalCount] = useState<number | null>(
    initialPage.totalCount,
  );
  const [sort, setSort] = useState(initialSort);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const loadingMore = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadFirstPage = useCallback(
    async (
      nextSort: PublicProjectSort,
      nextQuery: string,
      scrollToTop = false,
    ) => {
      const normalizedQuery = nextQuery.trim();
      const generation = ++requestGeneration.current;

      setSort(nextSort);
      setQuery(normalizedQuery);
      setItems([]);
      setNextPage(null);
      setTotalCount(null);
      setError(null);
      setIsRefreshing(true);
      replaceDiscoveryUrl(nextSort, normalizedQuery);
      if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      try {
        const page = await requestProjectPage(nextSort, normalizedQuery, 1);
        if (generation !== requestGeneration.current) return;
        setItems(page.items);
        setNextPage(page.nextPage);
        setTotalCount(page.totalCount);
      } catch (requestError) {
        if (generation !== requestGeneration.current) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load projects.",
        );
      } finally {
        if (generation === requestGeneration.current) setIsRefreshing(false);
      }
    },
    [],
  );

  const loadMoreProjects = useCallback(async () => {
    if (!nextPage || loadingMore.current) return;
    const generation = requestGeneration.current;
    loadingMore.current = true;
    setIsLoadingMore(true);
    setError(null);

    try {
      const page = await requestProjectPage(sort, query, nextPage);
      if (generation !== requestGeneration.current) return;
      setItems((currentItems) => {
        const knownIds = new Set(currentItems.map((item) => item.id));
        return [
          ...currentItems,
          ...page.items.filter((item) => !knownIds.has(item.id)),
        ];
      });
      setNextPage(page.nextPage);
      setTotalCount((currentTotal) =>
        page.totalCount === null ? currentTotal : page.totalCount,
      );
    } catch (requestError) {
      if (generation !== requestGeneration.current) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load projects.",
      );
    } finally {
      loadingMore.current = false;
      if (generation === requestGeneration.current) setIsLoadingMore(false);
    }
  }, [nextPage, query, sort]);

  useEffect(() => {
    const normalizedQuery = searchInput.trim();
    if (normalizedQuery === query) return;
    const timer = window.setTimeout(() => {
      void loadFirstPage(sort, normalizedQuery);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [loadFirstPage, query, searchInput, sort]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !nextPage || error) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMoreProjects();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [error, loadMoreProjects, nextPage]);

  const noResults = !isRefreshing && !error && items.length === 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {t("Products")}
            </h1>
            <p
              className="text-xs whitespace-nowrap text-muted-foreground"
              aria-live="polite"
            >
              {totalCount === null
                ? t("Counting products…")
                : t(totalCount === 1 ? "{count} product" : "{count} products", {
                    count: totalCount,
                  })}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-9 shrink-0"
            disabled={isRefreshing}
            title={t("Refresh projects")}
            aria-label={t("Refresh projects")}
            onClick={() => void loadFirstPage(sort, query, true)}
          >
            <RefreshCw
              className={isRefreshing ? "size-4 animate-spin" : "size-4"}
            />
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            className="flex shrink-0 gap-1 rounded-xl border bg-white p-1"
            role="group"
            aria-label={t("Project sorting")}
          >
            <Button
              type="button"
              size="sm"
              variant={sort === "latest" ? "default" : "ghost"}
              aria-pressed={sort === "latest"}
              disabled={isRefreshing && sort === "latest"}
              onClick={() => void loadFirstPage("latest", searchInput.trim())}
            >
              {t("Latest")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sort === "hot" ? "default" : "ghost"}
              aria-pressed={sort === "hot"}
              disabled={isRefreshing && sort === "hot"}
              onClick={() => void loadFirstPage("hot", searchInput.trim())}
            >
              {t("Hottest")}
            </Button>
          </div>
          <form
            className="relative min-w-0 flex-1"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              void loadFirstPage(sort, searchInput);
            }}
          >
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={searchInput}
              maxLength={MAX_PUBLIC_PROJECT_SEARCH_LENGTH}
              placeholder={t("Search project titles and descriptions")}
              aria-label={t("Search project titles and descriptions")}
              className="bg-white pl-10"
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </form>
        </div>
      </div>

      {isRefreshing ? (
        <div
          className="flex min-h-64 items-center justify-center text-sm text-muted-foreground"
          role="status"
        >
          <LoaderCircle className="mr-2 size-5 animate-spin" />
          {t("Loading projects…")}
        </div>
      ) : null}

      {!isRefreshing && items.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : null}

      {noResults ? (
        <EmptyState
          icon={query ? SearchX : Boxes}
          title={t(query ? "No matching projects" : "The launchpad is ready")}
          description={t(
            query
              ? "Try another keyword or switch the sorting mode."
              : "No approved products yet. Be the first builder to submit one for review.",
          )}
        />
      ) : null}

      {error ? (
        <div
          className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-800"
          role="alert"
        >
          <p>{t(error)}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null);
              if (items.length) {
                void loadMoreProjects();
              } else {
                void loadFirstPage(sort, query);
              }
            }}
          >
            {t("Try again")}
          </Button>
        </div>
      ) : null}

      <div ref={sentinel} className="flex min-h-16 items-center justify-center">
        {isLoadingMore ? (
          <span
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
          >
            <LoaderCircle className="size-4 animate-spin" />
            {t("Loading more projects…")}
          </span>
        ) : null}
        {!isRefreshing && !error && items.length > 0 && !nextPage ? (
          <span className="text-xs text-muted-foreground">
            {t("All projects are loaded.")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
