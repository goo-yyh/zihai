import { Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { acceptIdeaAction } from "@/actions/admin-idea";
import {
  IdeaCompletionForm,
  IdeaRejectionForm,
} from "@/components/admin/idea-review-forms";
import { Avatar } from "@/components/ui/avatar";
import { GitHubIcon } from "@/components/ui/brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminIdea } from "@/db/queries/admin";
import { ideaStatusLabel } from "@/lib/idea-lifecycle";
import { getTranslations } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function AdminIdeaPage({
  params,
}: PageProps<"/admin/ideas/[id]">) {
  const [{ id }, , { locale, t }] = await Promise.all([
    params,
    requireAdmin(),
    getTranslations(),
  ]);
  const idea = await getAdminIdea(id);
  if (!idea) notFound();

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight">{idea.title}</h1>
            <Badge variant={idea.status}>{ideaStatusLabel(idea.status)}</Badge>
          </div>
          <Link
            href={`/admin/users/${encodeURIComponent(idea.userId)}`}
            className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <Avatar
              src={idea.userImage}
              alt={idea.userUsername || idea.userEmail}
              size={30}
            />
            @{idea.userUsername || idea.userEmail}
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {idea.resultUrl ? (
            <Button asChild variant="outline">
              <a href={idea.resultUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> {t("Open product")}
              </a>
            </Button>
          ) : null}
          {idea.githubUrl ? (
            <Button asChild variant="outline">
              <a href={idea.githubUrl} target="_blank" rel="noreferrer">
                <GitHubIcon className="size-4" /> {t("Open GitHub")}
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("idea description")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-7">
            {idea.description}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Submitted", idea.createdAt],
          ["Reviewed", idea.reviewedAt],
          ["Completed", idea.completedAt],
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

      {idea.status === "pending" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            action={acceptIdeaAction.bind(null, idea.id)}
            className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4"
          >
            <p className="font-bold text-sky-900">{t("Accept this idea")}</p>
            <p className="mt-2 text-sm leading-6 text-sky-800">
              {t(
                "The user will see that the idea has been accepted and is waiting to be built.",
              )}
            </p>
            <Button type="submit" className="mt-4">
              <Check className="size-4" /> {t("Accept")}
            </Button>
          </form>
          <IdeaRejectionForm ideaId={idea.id} />
        </div>
      ) : null}

      {idea.status === "accepted" ? (
        <IdeaCompletionForm ideaId={idea.id} />
      ) : null}

      {idea.rejectionReason ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <strong>{t("Reason not accepted:")}</strong> {idea.rejectionReason}
        </div>
      ) : null}

      {idea.logs.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("Moderation history")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {idea.logs.map((log) => (
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
