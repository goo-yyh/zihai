import Link from "next/link";

import { CursorPagination } from "@/components/admin/cursor-pagination";
import { Badge } from "@/components/ui/badge";
import { getAdminProjects } from "@/db/queries/admin";
import { getTranslations } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";

const statuses = [
  "all",
  "pending",
  "approved",
  "rejected",
  "draft",
  "archived",
] as const;

export default async function AdminProjectsPage({
  searchParams,
}: PageProps<"/admin/projects">) {
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
  const projectPage = await getAdminProjects(
    active === "all" ? undefined : active,
    { cursor: typeof cursor === "string" ? cursor : undefined },
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">
          {t("Project moderation")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Review every project state and its submission context.")}
        </p>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map((item) => (
          <Link
            key={item}
            href={
              item === "all"
                ? "/admin/projects"
                : `/admin/projects?status=${item}`
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
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("Project")}</th>
              <th className="px-4 py-3">{t("Owner")}</th>
              <th className="px-4 py-3">{t("Status")}</th>
              <th className="px-4 py-3">{t("Submitted")}</th>
              <th className="px-4 py-3 text-right">{t("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {projectPage.items.map((project) => (
              <tr key={project.id} className="border-b last:border-0">
                <td className="px-4 py-4 font-bold">{project.name}</td>
                <td className="px-4 py-4 text-muted-foreground">
                  @{project.ownerUsername || project.ownerEmail}
                </td>
                <td className="px-4 py-4">
                  <Badge variant={project.status}>{project.status}</Badge>
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {formatDate(project.submittedAt, locale)}
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="font-bold text-primary hover:underline"
                  >
                    {t("Review")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!projectPage.items.length ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {t("No projects in this view.")}
          </p>
        ) : null}
      </div>
      <CursorPagination
        page={projectPage}
        basePath="/admin/projects"
        preservedParams={{ status: active === "all" ? undefined : active }}
      />
    </div>
  );
}
