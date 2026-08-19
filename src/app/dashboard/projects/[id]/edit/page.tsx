import { Code2, ExternalLink, Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteProjectAction, submitProjectAction } from "@/actions/project";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { ImageManager } from "@/components/project/image-manager";
import { ProjectForm } from "@/components/project/project-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOwnedProject } from "@/db/queries/dashboard";
import { isFeatureEnabled } from "@/lib/features";
import { getTranslations } from "@/lib/i18n-server";
import { requireOnboardedUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function EditProjectPage({
  params,
  searchParams,
}: PageProps<"/dashboard/projects/[id]/edit">) {
  const [{ id }, query, session, { locale, t }] = await Promise.all([
    params,
    searchParams,
    requireOnboardedUser(),
    getTranslations(),
  ]);
  const project = await getOwnedProject(id, session.user.id);
  if (!project) notFound();
  const iterationsEnabled = isFeatureEnabled("iterations");
  const canSubmit =
    ["draft", "rejected"].includes(project.status) &&
    project.images.length >= 1;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight">
              {project.name}
            </h1>
            <Badge variant={project.status}>{project.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("Created {date} · Public slug /p/{slug}", {
              date: formatDate(project.createdAt, locale),
              slug: project.slug,
            })}
          </p>
        </div>
        {project.status === "approved" ? (
          <Button asChild variant="outline">
            <Link href={`/p/${project.slug}`} target="_blank">
              <ExternalLink className="size-4" /> {t("View public page")}
            </Link>
          </Button>
        ) : null}
      </div>
      {iterationsEnabled && query.submitted === "iteration" ? (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          {t("Iteration submitted for review.")}
        </p>
      ) : null}
      {project.rejectionReason ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="font-bold text-rose-900">{t("Reviewer feedback")}</p>
          <p className="mt-1 text-sm leading-6 text-rose-800">
            {project.rejectionReason}
          </p>
        </div>
      ) : null}
      {project.status === "pending" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          {t(
            "This project is in review. You can still edit it, but changes remain private until approved.",
          )}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("Listing")}</CardTitle>
          <CardDescription>
            {t(
              "Saving an approved listing automatically returns it to review.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ProjectForm project={project} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Screenshots")}</CardTitle>
          <CardDescription>
            {t(
              "Add between 1 and 3 images. The first image becomes the listing cover.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ImageManager
            kind="project-image"
            resourceId={project.id}
            projectId={project.id}
            images={project.images}
          />
        </CardContent>
      </Card>

      {iterationsEnabled ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{t("Iterations")}</CardTitle>
              <CardDescription className="mt-1">
                {t(
                  "Publish meaningful updates after the project itself is approved.",
                )}
              </CardDescription>
            </div>
            {project.status === "approved" ? (
              <Button asChild size="sm">
                <Link href={`/dashboard/projects/${project.id}/iterations/new`}>
                  <Plus className="size-4" /> {t("New iteration")}
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="pt-4">
            {project.iterations.length ? (
              <div className="divide-y rounded-xl border">
                {project.iterations.map((iteration) => (
                  <Link
                    key={iteration.id}
                    href={`/dashboard/projects/${project.id}/iterations/${iteration.id}/edit`}
                    className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-bold">
                        {iteration.versionLabel || t("Untitled update")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(iteration.createdAt, locale)}
                      </p>
                    </div>
                    <Badge variant={iteration.status}>{iteration.status}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                {t("No iterations yet.")}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5">
        <div>
          <p className="font-bold">{t("Ready for review?")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("A project needs at least one screenshot and complete details.")}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={deleteProjectAction.bind(null, project.id)}>
            <ConfirmSubmitButton
              variant="danger"
              message="Delete this project, all iterations, and every uploaded image permanently?"
            >
              <Trash2 className="size-4" /> {t("Delete")}
            </ConfirmSubmitButton>
          </form>
          {["draft", "rejected"].includes(project.status) ? (
            <form action={submitProjectAction.bind(null, project.id)}>
              <Button type="submit" disabled={!canSubmit}>
                <Send className="size-4" /> {t("Submit for review")}
              </Button>
            </form>
          ) : null}
          {project.websiteUrl ? (
            <Button asChild variant="outline">
              <a href={project.websiteUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> {t("Visit product")}
              </a>
            </Button>
          ) : null}
          {project.githubUrl ? (
            <Button asChild variant="outline">
              <a href={project.githubUrl} target="_blank" rel="noreferrer">
                <Code2 className="size-4" /> {t("View code")}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
