import { Check, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { approveIterationAction } from "@/actions/admin-iteration";
import { RejectionForm } from "@/components/admin/review-form";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminIteration } from "@/db/queries/admin";
import { isFeatureEnabled } from "@/lib/features";
import { getTranslations } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function AdminIterationPage({
  params,
}: PageProps<"/admin/iterations/[id]">) {
  if (!isFeatureEnabled("iterations")) notFound();

  const [{ id }, , { locale, t }] = await Promise.all([
    params,
    requireAdmin(),
    getTranslations(),
  ]);
  const iteration = await getAdminIteration(id);
  if (!iteration) notFound();
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight">
              {iteration.versionLabel || t("Untitled iteration")}
            </h1>
            <Badge variant={iteration.status}>{iteration.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("for {project}", { project: iteration.projectName })}
          </p>
          <Link
            href={`/admin/users/${encodeURIComponent(iteration.ownerId)}`}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <Avatar
              src={iteration.ownerImage}
              alt={iteration.ownerUsername || iteration.ownerEmail}
              size={28}
            />{" "}
            @{iteration.ownerUsername || iteration.ownerEmail}
          </Link>
        </div>
        {iteration.projectStatus === "approved" ? (
          <Button asChild variant="outline">
            <Link href={`/p/${iteration.projectSlug}`} target="_blank">
              <ExternalLink className="size-4" /> {t("Public project")}
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {iteration.images.map((image, index) => (
          <div
            key={image.id}
            className="relative aspect-[16/10] overflow-hidden rounded-2xl border bg-muted"
          >
            <Image
              src={image.blobUrl}
              alt={t("Iteration screenshot {number}", { number: index + 1 })}
              fill
              sizes="(max-width: 640px) 100vw, 280px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("What changed?")}</CardTitle>
        </CardHeader>
        <CardContent>
          <article>
            <MarkdownContent>{iteration.description}</MarkdownContent>
          </article>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["Submitted", iteration.submittedAt],
          ["Approved", iteration.approvedAt],
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
      {iteration.status === "pending" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            action={approveIterationAction.bind(null, iteration.id)}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
          >
            <p className="font-bold text-emerald-900">
              {t("Approve iteration")}
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              {t(
                "This update will be added to the project’s public build log.",
              )}
            </p>
            <Button type="submit" className="mt-4">
              <Check className="size-4" /> {t("Approve")}
            </Button>
          </form>
          <RejectionForm kind="iteration" resourceId={iteration.id} />
        </div>
      ) : iteration.rejectionReason ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <strong>{t("Rejection reason:")}</strong> {iteration.rejectionReason}
        </div>
      ) : null}
      {iteration.logs.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("Moderation history")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {iteration.logs.map((log) => (
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
