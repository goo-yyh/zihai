import { Search } from "lucide-react";

import { CursorPagination } from "@/components/admin/cursor-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuditLogs } from "@/db/queries/admin";
import { isFeatureEnabled } from "@/lib/features";
import { getTranslations } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function AuditPage({
  searchParams,
}: PageProps<"/admin/audit">) {
  const [, { cursor, q, target }, { locale, t }] = await Promise.all([
    requireAdmin(),
    searchParams,
    getTranslations(),
  ]);
  const search = typeof q === "string" ? q.slice(0, 100) : "";
  const iterationsEnabled = isFeatureEnabled("iterations");
  const targetType =
    target === "project" ||
    target === "idea" ||
    target === "user" ||
    (iterationsEnabled && target === "iteration")
      ? target
      : undefined;
  const logPage = await getAuditLogs(
    { search, targetType },
    { cursor: typeof cursor === "string" ? cursor : undefined },
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{t("Audit log")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Moderation and access-control events, newest first.")}
        </p>
      </div>
      <form
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]"
        action="/admin/audit"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={search}
            className="pl-9"
            placeholder={t("Search action, target, admin, or reason")}
          />
        </div>
        <select
          name="target"
          defaultValue={targetType || ""}
          className="h-11 rounded-xl border bg-white px-3.5 text-sm shadow-sm focus:border-primary focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          aria-label={t("Target type")}
        >
          <option value="">{t("All target types")}</option>
          <option value="project">{t("Projects")}</option>
          <option value="idea">{t("ideas")}</option>
          {iterationsEnabled ? (
            <option value="iteration">{t("Iterations")}</option>
          ) : null}
          <option value="user">{t("Users")}</option>
        </select>
        <Button type="submit" variant="outline">
          {t("Filter")}
        </Button>
      </form>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("Action")}</th>
              <th className="px-4 py-3">{t("Admin")}</th>
              <th className="px-4 py-3">{t("Target")}</th>
              <th className="px-4 py-3">{t("Reason")}</th>
              <th className="px-4 py-3">{t("Date")}</th>
            </tr>
          </thead>
          <tbody>
            {logPage.items.map((log) => (
              <tr key={log.id} className="border-b last:border-0">
                <td className="px-4 py-4 font-bold">
                  {log.action.replaceAll("_", " ")}
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  @{log.adminUsername || log.adminEmail || t("deleted admin")}
                </td>
                <td className="px-4 py-4 font-mono text-xs">
                  {log.targetType}:{log.targetId}
                </td>
                <td className="max-w-xs px-4 py-4 text-muted-foreground">
                  {log.reason || "—"}
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {formatDate(log.createdAt, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logPage.items.length ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {t("No moderation actions recorded yet.")}
          </p>
        ) : null}
      </div>
      <CursorPagination
        page={logPage}
        basePath="/admin/audit"
        preservedParams={{
          q: search || undefined,
          target: targetType,
        }}
      />
    </div>
  );
}
