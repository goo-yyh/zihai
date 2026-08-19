import {
  CheckCircle2,
  Clock3,
  FolderKanban,
  ListChecks,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminProjects, getAdminStats } from "@/db/queries/admin";
import { isFeatureEnabled } from "@/lib/features";
import { getTranslations } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function AdminPage() {
  const [, stats, pendingPage, { locale, t }] = await Promise.all([
    requireAdmin(),
    getAdminStats(),
    getAdminProjects("pending", { pageSize: 8 }),
    getTranslations(),
  ]);
  const pending = pendingPage.items;
  const iterationCards: Array<[string, number, LucideIcon]> = isFeatureEnabled(
    "iterations",
  )
    ? [["Pending iterations", stats.pendingIterations, ListChecks]]
    : [];
  const cards: Array<[string, number, LucideIcon]> = [
    ["Users", stats.users, Users],
    ["All projects", stats.projects, FolderKanban],
    ["Pending projects", stats.pendingProjects, Clock3],
    ...iterationCards,
    ["Approved", stats.approvedProjects, CheckCircle2],
    ["Rejected", stats.rejectedProjects, XCircle],
  ];
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-primary">
          {t("Review operations")}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          {t("Admin overview")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Moderate launches, access, and platform safety.")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value, Icon]) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">
                {t(label)}
              </p>
              <Icon className="size-4 text-primary" />
            </div>
            <p className="mt-4 text-3xl font-black">{value}</p>
          </Card>
        ))}
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">{t("Pending projects")}</h2>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/projects?status=pending">{t("Open queue")}</Link>
          </Button>
        </div>
        {pending.length ? (
          <div className="overflow-hidden rounded-2xl border bg-white">
            {pending.map((project) => (
              <Link
                href={`/admin/projects/${project.id}`}
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b p-4 last:border-0 hover:bg-muted/40"
              >
                <div>
                  <p className="font-bold">{project.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("@{owner} · submitted {date}", {
                      owner: project.ownerUsername || project.ownerEmail,
                      date: formatDate(project.submittedAt, locale),
                    })}
                  </p>
                </div>
                <Badge variant="pending">pending</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {t("The project queue is clear.")}
          </Card>
        )}
      </section>
    </div>
  );
}
