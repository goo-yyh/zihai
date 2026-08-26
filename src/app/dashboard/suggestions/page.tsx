import { MessageSquareText } from "lucide-react";
import Link from "next/link";

import { CursorPagination } from "@/components/admin/cursor-pagination";
import { ProjectSuggestionList } from "@/components/dashboard/project-suggestion-list";
import { Card } from "@/components/ui/card";
import {
  getFocusedProjectSuggestion,
  getReceivedProjectSuggestions,
  getSubmittedProjectSuggestions,
} from "@/db/queries/project-suggestions";
import { getTranslations } from "@/lib/i18n-server";
import {
  projectSuggestionStatusLabel,
  PROJECT_SUGGESTION_STATUSES,
} from "@/lib/project-suggestion-lifecycle";
import { requireOnboardedUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { dashboardSuggestionParamsSchema } from "@/lib/validations";

const statuses = ["all", ...PROJECT_SUGGESTION_STATUSES] as const;

export default async function DashboardSuggestionsPage({
  searchParams,
}: PageProps<"/dashboard/suggestions">) {
  const [session, rawParams, { t }] = await Promise.all([
    requireOnboardedUser(),
    searchParams,
    getTranslations(),
  ]);
  const parsed = dashboardSuggestionParamsSchema.safeParse({
    view: typeof rawParams.view === "string" ? rawParams.view : undefined,
    status: typeof rawParams.status === "string" ? rawParams.status : undefined,
    cursor: typeof rawParams.cursor === "string" ? rawParams.cursor : undefined,
    focus: typeof rawParams.focus === "string" ? rawParams.focus : undefined,
  });
  const filters = parsed.success
    ? parsed.data
    : { view: "received" as const, status: "all" as const };
  const status = filters.status === "all" ? undefined : filters.status;
  const pagePromise =
    filters.view === "received"
      ? getReceivedProjectSuggestions(
          session.user.id,
          { status },
          { cursor: filters.cursor, pageSize: 20 },
        )
      : getSubmittedProjectSuggestions(
          session.user.id,
          { status },
          { cursor: filters.cursor, pageSize: 20 },
        );
  const [page, focused] = await Promise.all([
    pagePromise,
    filters.focus
      ? getFocusedProjectSuggestion(
          filters.focus,
          session.user.id,
          filters.view,
        )
      : null,
  ]);
  const focusedOnPage = focused
    ? page.items.some((item) => item.id === focused.id)
    : false;

  function viewHref(view: "received" | "submitted") {
    return `/dashboard/suggestions?view=${view}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">
          {t("Project suggestions")}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          {t("Suggestions")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Track suggestions you receive and send.")}
        </p>
      </div>

      <nav className="grid gap-2 sm:grid-cols-2">
        {(["received", "submitted"] as const).map((view) => (
          <Link
            key={view}
            href={viewHref(view)}
            className={cn(
              "rounded-xl border bg-white px-4 py-3 text-center text-sm font-bold",
              filters.view === view && "border-primary bg-primary text-white",
            )}
          >
            {t(view === "received" ? "Received suggestions" : "My suggestions")}
          </Link>
        ))}
      </nav>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map((item) => {
          const params = new URLSearchParams({ view: filters.view });
          if (item !== "all") params.set("status", item);
          return (
            <Link
              key={item}
              href={`/dashboard/suggestions?${params.toString()}`}
              className={cn(
                "rounded-full border bg-white px-3 py-1.5 text-xs font-bold",
                filters.status === item &&
                  "border-primary bg-primary text-white",
              )}
            >
              {t(item === "all" ? "All" : projectSuggestionStatusLabel(item))}
            </Link>
          );
        })}
      </nav>

      {filters.focus && !focused ? (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {t("This suggestion no longer exists or is unavailable.")}
        </Card>
      ) : null}
      {focused && !focusedOnPage ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            {t("Selected suggestion")}
          </p>
          <ProjectSuggestionList
            items={[focused]}
            view={filters.view}
            focusId={focused.id}
          />
        </div>
      ) : null}

      <ProjectSuggestionList
        items={page.items}
        view={filters.view}
        focusId={filters.focus}
      />
      <CursorPagination
        page={page}
        basePath="/dashboard/suggestions"
        preservedParams={{
          view: filters.view,
          status: filters.status === "all" ? undefined : filters.status,
        }}
      />

      {!page.items.length && !focused ? (
        <MessageSquareText className="mx-auto size-4 text-muted-foreground" />
      ) : null}
    </div>
  );
}
