import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Heart,
  Plus,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getUserProjects } from "@/db/queries/dashboard";
import { getTranslations } from "@/lib/i18n-server";
import { requireOnboardedUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const [session, { locale, t }] = await Promise.all([
    requireOnboardedUser(),
    getTranslations(),
  ]);
  const projects = await getUserProjects(session.user.id);
  const stats = {
    total: projects.length,
    approved: projects.filter((project) => project.status === "approved")
      .length,
    pending: projects.filter((project) => project.status === "pending").length,
    likes: projects.reduce(
      (sum, project) => sum + Number(project.likeCount),
      0,
    ),
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">
            {t("Builder dashboard")}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            {t("Welcome back, @{username}", {
              username: session.user.username || "",
            })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("Manage launches and share what changed next.")}
          </p>
        </div>
        <Button asChild>
          <Link href="/submit">
            <Plus className="size-4" /> {t("New project")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["Projects", stats.total, Clock3],
            ["Approved", stats.approved, CheckCircle2],
            ["In review", stats.pending, XCircle],
            ["Total likes", stats.likes, Heart],
          ] satisfies Array<[string, number, LucideIcon]>
        ).map(([label, value, Icon]) => (
          <Card key={String(label)} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">
                {t(String(label))}
              </span>
              <Icon className="size-4 text-primary" />
            </div>
            <p className="mt-4 text-3xl font-black">{String(value)}</p>
          </Card>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">{t("Recent projects")}</h2>
          <Link
            href="/dashboard/projects"
            className="flex items-center gap-1 text-sm font-bold text-primary"
          >
            {t("View all")} <ArrowRight className="size-4" />
          </Link>
        </div>
        {projects.length ? (
          <div className="overflow-hidden rounded-2xl border bg-white">
            {projects.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}/edit`}
                className="flex flex-wrap items-center justify-between gap-3 border-b p-4 last:border-0 hover:bg-muted/45"
              >
                <div>
                  <p className="font-bold">{project.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Updated {date}", {
                      date: formatDate(project.updatedAt, locale),
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <Heart className="size-3.5" /> {project.likeCount}
                  </span>
                  <Badge variant={project.status}>{project.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="font-bold">{t("Your first launch starts here.")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Create a project, add screenshots, then send it for review.")}
            </p>
            <Button asChild className="mt-5">
              <Link href="/submit">{t("Create project")}</Link>
            </Button>
          </Card>
        )}
      </section>
    </div>
  );
}
