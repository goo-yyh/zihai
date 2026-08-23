import Link from "next/link";

import { CursorPagination } from "@/components/admin/cursor-pagination";
import { Badge } from "@/components/ui/badge";
import { getAdminIdeas } from "@/db/queries/admin";
import { ideaStatusLabel, IDEA_STATUSES } from "@/lib/idea-lifecycle";
import { getTranslations } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";

const statuses = ["all", ...IDEA_STATUSES] as const;

export default async function AdminIdeasPage({
  searchParams,
}: PageProps<"/admin/ideas">) {
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
  const ideaPage = await getAdminIdeas(active === "all" ? undefined : active, {
    cursor: typeof cursor === "string" ? cursor : undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">
          {t("idea management")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Review ideas, record decisions, and share finished results.")}
        </p>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map((item) => (
          <Link
            key={item}
            href={
              item === "all" ? "/admin/ideas" : `/admin/ideas?status=${item}`
            }
            className={cn(
              "rounded-full border bg-white px-3 py-1.5 text-xs font-bold",
              active === item && "border-primary bg-primary text-white",
            )}
          >
            {t(item === "all" ? item : ideaStatusLabel(item))}
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("idea")}</th>
              <th className="px-4 py-3">{t("From")}</th>
              <th className="px-4 py-3">{t("Status")}</th>
              <th className="px-4 py-3">{t("Submitted")}</th>
              <th className="px-4 py-3 text-right">{t("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {ideaPage.items.map((idea) => (
              <tr key={idea.id} className="border-b last:border-0">
                <td className="px-4 py-4 font-bold">{idea.title}</td>
                <td className="px-4 py-4 text-muted-foreground">
                  @{idea.userUsername || idea.userEmail}
                </td>
                <td className="px-4 py-4">
                  <Badge variant={idea.status}>
                    {ideaStatusLabel(idea.status)}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {formatDate(idea.createdAt, locale)}
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/admin/ideas/${idea.id}`}
                    className="font-bold text-primary hover:underline"
                  >
                    {t("Review")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ideaPage.items.length ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {t("No ideas in this view.")}
          </p>
        ) : null}
      </div>
      <CursorPagination
        page={ideaPage}
        basePath="/admin/ideas"
        preservedParams={{ status: active === "all" ? undefined : active }}
      />
    </div>
  );
}
