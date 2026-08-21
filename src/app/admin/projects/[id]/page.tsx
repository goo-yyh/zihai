import { Archive, Check, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approveProjectAction,
  archiveProjectAction,
  republishProjectAction,
} from "@/actions/admin-project";
import { RejectionForm } from "@/components/admin/review-form";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { Avatar } from "@/components/ui/avatar";
import { ChromeIcon, GitHubIcon } from "@/components/ui/brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminProject } from "@/db/queries/admin";
import { getTranslations } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function AdminProjectPage({
  params,
}: PageProps<"/admin/projects/[id]">) {
  const [{ id }, , { locale, t }] = await Promise.all([
    params,
    requireAdmin(),
    getTranslations(),
  ]);
  const project = await getAdminProject(id);
  if (!project) notFound();
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight">
              {project.name}
            </h1>
            <Badge variant={project.status}>{project.status}</Badge>
          </div>
          <Link
            href={`/admin/users/${encodeURIComponent(project.ownerId)}`}
            className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <Avatar
              src={project.ownerImage}
              alt={project.ownerUsername || project.ownerEmail}
              size={30}
            />{" "}
            @{project.ownerUsername || project.ownerEmail}
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.websiteUrl ? (
            <Button asChild variant="outline">
              <a href={project.websiteUrl} target="_blank" rel="noreferrer">
                <ChromeIcon className="size-4" /> {t("Inspect website")}
              </a>
            </Button>
          ) : null}
          {project.githubUrl ? (
            <Button asChild variant="outline">
              <a href={project.githubUrl} target="_blank" rel="noreferrer">
                <GitHubIcon className="size-4" /> {t("Inspect repository")}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {project.images.map((image, index) => (
          <div
            key={image.id}
            className="relative aspect-[16/10] overflow-hidden rounded-2xl border bg-muted"
          >
            <Image
              src={image.blobUrl}
              alt={t("Submission screenshot {number}", { number: index + 1 })}
              fill
              sizes="(max-width: 640px) 100vw, 280px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("Description")}</CardTitle>
        </CardHeader>
        <CardContent>
          <article>
            <MarkdownContent>{project.description}</MarkdownContent>
          </article>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Submitted", project.submittedAt],
          ["Approved", project.approvedAt],
          ["Published", project.publishedAt],
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t(String(label))}
            </p>
            <p className="mt-2 text-sm font-semibold">
              {formatDate(value as Date | null, locale)}
            </p>
          </Card>
        ))}
      </div>
      {project.status === "pending" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            action={approveProjectAction.bind(null, project.id)}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
          >
            <p className="font-bold text-emerald-900">
              {t("Approve for publication")}
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              {t(
                "This immediately makes the project visible on the homepage, profile, and sitemap.",
              )}
            </p>
            <Button type="submit" className="mt-4">
              <Check className="size-4" /> {t("Approve")}
            </Button>
          </form>
          <RejectionForm kind="project" resourceId={project.id} />
        </div>
      ) : project.rejectionReason ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <strong>{t("Rejection reason:")}</strong> {project.rejectionReason}
        </div>
      ) : null}
      {project.status === "approved" ? (
        <form
          action={archiveProjectAction.bind(null, project.id)}
          className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"
        >
          <p className="font-bold text-amber-900">
            {t("Archive this project")}
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            {t(
              "This immediately hides the project from the homepage, profile, and sitemap. You can republish it later.",
            )}
          </p>
          <Button type="submit" variant="outline" className="mt-4">
            <Archive className="size-4" /> {t("Archive")}
          </Button>
        </form>
      ) : null}
      {project.status === "archived" ? (
        <form
          action={republishProjectAction.bind(null, project.id)}
          className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
        >
          <p className="font-bold text-emerald-900">
            {t("Republish this project")}
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            {t(
              "This puts the archived project back on the homepage and profile after re-checking its images.",
            )}
          </p>
          <Button type="submit" className="mt-4">
            <RefreshCw className="size-4" /> {t("Republish")}
          </Button>
        </form>
      ) : null}
      {project.logs.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("Moderation history")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.logs.map((log) => (
              <div
                key={log.id}
                className="flex justify-between gap-4 border-b pb-3 text-sm last:border-0"
              >
                <span>
                  <strong>{log.action.replaceAll("_", " ")}</strong>
                  {log.reason ? ` — ${log.reason}` : ""}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(log.createdAt, locale)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
