import { Inbox } from "lucide-react";
import Link from "next/link";

import { CursorPagination } from "@/components/admin/cursor-pagination";
import { Avatar } from "@/components/ui/avatar";
import { getAdminFeedback } from "@/db/queries/admin";
import { getTranslations } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function AdminFeedbackPage({
  searchParams,
}: PageProps<"/admin/feedback">) {
  const [, { cursor }, { locale, t }] = await Promise.all([
    requireAdmin(),
    searchParams,
    getTranslations(),
  ]);
  const feedbackPage = await getAdminFeedback({
    cursor: typeof cursor === "string" ? cursor : undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{t("Feedback")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Suggestions submitted by signed-in users, newest first.")}
        </p>
      </div>
      {feedbackPage.items.length ? (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("From")}</th>
                <th className="px-4 py-3">{t("Feedback")}</th>
                <th className="px-4 py-3">{t("Date")}</th>
              </tr>
            </thead>
            <tbody>
              {feedbackPage.items.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/admin/users/${encodeURIComponent(entry.userId)}`}
                      className="flex items-center gap-2 font-semibold hover:text-primary"
                    >
                      <Avatar
                        src={entry.userImage}
                        alt={entry.userUsername || entry.userEmail}
                        size={26}
                      />
                      @{entry.userUsername || entry.userEmail}
                    </Link>
                  </td>
                  <td className="max-w-xl px-4 py-3 leading-6">
                    {entry.content}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(entry.createdAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-white p-10 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t("No feedback yet.")}
          </p>
        </div>
      )}
      <CursorPagination page={feedbackPage} basePath="/admin/feedback" />
    </div>
  );
}
