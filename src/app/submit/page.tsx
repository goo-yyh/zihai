import type { Metadata } from "next";

import { ProjectForm } from "@/components/project/project-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserProjectCount } from "@/db/queries/dashboard";
import { getTranslations } from "@/lib/i18n-server";
import { canCreateProject, PROJECT_LIMIT_MESSAGE } from "@/lib/project-limits";
import { requireOnboardedUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return {
    title: t("Submit a project"),
    robots: { index: false, follow: false },
  };
}

export default async function SubmitPage() {
  const [session, { t }] = await Promise.all([
    requireOnboardedUser(),
    getTranslations(),
  ]);
  const projectLimitReached = !canCreateProject(
    await getUserProjectCount(session.user.id),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
          {t("New launch")}
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">
          {t("Show us what you built")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(
            "Start with the story and destination. You will add 1–5 screenshots before submitting for human review.",
          )}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {t(
              projectLimitReached ? "Project limit reached" : "Project details",
            )}
          </CardTitle>
          <CardDescription>
            {t(
              projectLimitReached
                ? PROJECT_LIMIT_MESSAGE
                : "Add a public website, a public GitHub repository, or both.",
            )}
          </CardDescription>
        </CardHeader>
        {projectLimitReached ? null : (
          <CardContent className="pt-4">
            <ProjectForm />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
