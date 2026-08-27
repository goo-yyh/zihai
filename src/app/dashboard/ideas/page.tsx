import { ExternalLink, Inbox, Lightbulb } from "lucide-react";

import { CursorPagination } from "@/components/admin/cursor-pagination";
import { GitHubIcon } from "@/components/ui/brand-icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getUserIdeas } from "@/db/queries/dashboard";
import { ideaStatusLabel } from "@/lib/idea-lifecycle";
import { getTranslations } from "@/lib/i18n-server";
import { requireOnboardedUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function DashboardIdeasPage({
  searchParams,
}: PageProps<"/dashboard/ideas">) {
  const [session, { cursor }, { locale, t }] = await Promise.all([
    requireOnboardedUser(),
    searchParams,
    getTranslations(),
  ]);
  const ideaPage = await getUserIdeas(session.user.id, {
    cursor: typeof cursor === "string" ? cursor : undefined,
    pageSize: 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">{t("ideas")}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          {t("My ideas")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Follow every idea from review to a finished product.")}
        </p>
      </div>

      {ideaPage.items.length ? (
        <div className="space-y-4">
          {ideaPage.items.map((idea) => (
            <Card key={idea.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-black">{idea.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Submitted {date}", {
                      date: formatDate(idea.createdAt, locale),
                    })}
                  </p>
                </div>
                <Badge variant={idea.status}>
                  {ideaStatusLabel(idea.status)}
                </Badge>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {idea.description}
              </p>

              {idea.rejectionReason ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  <strong>{t("Reason not accepted:")}</strong>{" "}
                  {idea.rejectionReason}
                </div>
              ) : null}

              {idea.status === "completed" ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-bold text-emerald-900">
                    {t("Your idea has been built")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {idea.resultUrl ? (
                      <a
                        href={idea.resultUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                      >
                        <ExternalLink className="size-4" />
                        {t("Open product")}
                      </a>
                    ) : null}
                    {idea.githubUrl ? (
                      <a
                        href={idea.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                      >
                        <GitHubIcon className="size-4" />
                        {t("Open GitHub")}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <Inbox className="size-6" />
          </div>
          <p className="font-bold">{t("No ideas submitted yet.")}</p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            {t(
              "Use the lightbulb in the header when you think of something we could build together.",
            )}
          </p>
          <Lightbulb className="mt-1 size-4 text-amber-700" />
        </Card>
      )}
      <CursorPagination page={ideaPage} basePath="/dashboard/ideas" />
    </div>
  );
}
