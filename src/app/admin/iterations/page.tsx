import Link from "next/link";
import { notFound } from "next/navigation";

import { CursorPagination } from "@/components/admin/cursor-pagination";
import { Badge } from "@/components/ui/badge";
import { getAdminIterations } from "@/db/queries/admin";
import { isFeatureEnabled } from "@/lib/features";
import { getTranslations } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";
import { cn, formatDate, truncate } from "@/lib/utils";

const statuses = ["all", "pending", "approved", "rejected", "draft"] as const;

export default async function AdminIterationsPage({
  searchParams,
}: PageProps<"/admin/iterations">) {
  if (!isFeatureEnabled("iterations")) notFound();

  const [, { status, cursor }, { locale, t }] = await Promise.all([
    requireAdmin(),
    searchParams,
    getTranslations(),
  ]);
  const active =
    typeof status === "string" &&
    statuses.includes(status as (typeof statuses)[number])
      ? status
      : "all";
  const iterationPage = await getAdminIterations(
    active === "all" ? undefined : active,
    { cursor: typeof cursor === "string" ? cursor : undefined },
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">
          {t("Iteration moderation")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Keep published build logs useful, specific, and safe.")}
        </p>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map((item) => (
          <Link
            key={item}
            href={
              item === "all"
                ? "/admin/iterations"
                : `/admin/iterations?status=${item}`
            }
            className={cn(
              "rounded-full border bg-white px-3 py-1.5 text-xs font-bold capitalize",
              active === item && "border-primary bg-primary text-white",
            )}
          >
            {t(item)}
          </Link>
        ))}
      </nav>
      <div className="space-y-3">
        {iterationPage.items.map((iteration) => (
          <Link
            key={iteration.id}
            href={`/admin/iterations/${iteration.id}`}
            className="flex flex-col gap-3 rounded-2xl border bg-white p-5 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold">
                  {iteration.versionLabel || t("Untitled update")}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {t("for {project}", { project: iteration.projectName })}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {truncate(iteration.description.replace(/[#*_`]/g, ""), 120)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                @{iteration.ownerUsername || "builder"} ·{" "}
                {formatDate(iteration.submittedAt, locale)}
              </p>
            </div>
            <Badge variant={iteration.status}>{iteration.status}</Badge>
          </Link>
        ))}
        {!iterationPage.items.length ? (
          <p className="rounded-2xl border border-dashed bg-white/60 p-8 text-center text-sm text-muted-foreground">
            {t("No iterations in this view.")}
          </p>
        ) : null}
      </div>
      <CursorPagination
        page={iterationPage}
        basePath="/admin/iterations"
        preservedParams={{ status: active === "all" ? undefined : active }}
      />
    </div>
  );
}
