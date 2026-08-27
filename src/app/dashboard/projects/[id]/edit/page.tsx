import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteProjectAction, submitProjectAction } from "@/actions/project";
import { ImageManager } from "@/components/project/image-manager";
import { ProjectForm } from "@/components/project/project-form";
import {
  DeleteProjectButton,
  ReviewSubmitBarrier,
  SaveProjectButton,
  SubmitReviewForm,
} from "@/components/project/review-submit";
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
import { getTranslations } from "@/lib/i18n-server";
import { publicProjectPath } from "@/lib/public-routes";
import { requireOnboardedUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function EditProjectPage({
  params,
}: PageProps<"/dashboard/projects/[id]/edit">) {
  const [{ id }, session, { locale, t }] = await Promise.all([
    params,
    requireOnboardedUser(),
    getTranslations(),
  ]);
  const project = await getOwnedProject(id, session.user.id);
  if (!project) notFound();
  const canSubmit =
    ["draft", "rejected"].includes(project.status) &&
    project.images.length >= 1;

  return (
    <div className="space-y-7 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight">
              {project.name}
            </h1>
            <Badge variant={project.status}>{project.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("Created {date} · Public URL {path}", {
              date: formatDate(project.createdAt, locale),
              path: publicProjectPath(project),
            })}
          </p>
        </div>
        {project.status === "approved" ? (
          <Button asChild variant="outline">
            <Link href={publicProjectPath(project)} target="_blank">
              <ExternalLink className="size-4" /> {t("View public page")}
            </Link>
          </Button>
        ) : null}
      </div>
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

      <ReviewSubmitBarrier>
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
            <ProjectForm project={project} formId="project-edit-form" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Screenshots")}</CardTitle>
            <CardDescription>
              {t(
                "Add between 1 and 5 images. The first image becomes the listing cover.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ImageManager projectId={project.id} images={project.images} />
          </CardContent>
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <SaveProjectButton formId="project-edit-form" />
            <DeleteProjectButton
              action={deleteProjectAction.bind(null, project.id)}
              confirmMessage="Delete this project and every uploaded image permanently?"
            />
            {["draft", "rejected"].includes(project.status) ? (
              <SubmitReviewForm
                action={submitProjectAction.bind(null, project.id)}
                canSubmit={canSubmit}
              />
            ) : null}
          </div>
        </div>
      </ReviewSubmitBarrier>
    </div>
  );
}
