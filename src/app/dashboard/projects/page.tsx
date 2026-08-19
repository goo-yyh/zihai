import { Heart, Pencil, Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getUserProjects } from "@/db/queries/dashboard";
import { getTranslations } from "@/lib/i18n-server";
import { requireOnboardedUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function ProjectsPage() {
  const [session, { locale, t }] = await Promise.all([
    requireOnboardedUser(),
    getTranslations(),
  ]);
  const projects = await getUserProjects(session.user.id);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {t("My projects")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("Draft, submit, and keep every launch moving.")}
          </p>
        </div>
        <Button asChild>
          <Link href="/submit">
            <Plus className="size-4" /> {t("New project")}
          </Link>
        </Button>
      </div>
      {projects.length ? (
        <div className="grid gap-4">
          {projects.map((project) => (
            <article
              key={project.id}
              className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-bold">{project.name}</h2>
                  <Badge variant={project.status}>{project.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("Updated {date} · {count} likes", {
                    date: formatDate(project.updatedAt, locale),
                    count: project.likeCount,
                  })}{" "}
                  <Heart className="inline size-3.5" />
                </p>
                {project.rejectionReason ? (
                  <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
                    {t("Reviewer: {reason}", {
                      reason: project.rejectionReason,
                    })}
                  </p>
                ) : null}
              </div>
              <Button asChild variant="outline">
                <Link href={`/dashboard/projects/${project.id}/edit`}>
                  <Pencil className="size-4" /> {t("Manage")}
                </Link>
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Plus}
          title={t("No projects yet")}
          description={t(
            "Create your first AI product listing and prepare it for review.",
          )}
          action={
            <Button asChild>
              <Link href="/submit">{t("Create project")}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
