import { Boxes } from "lucide-react";
import Link from "next/link";

import { ProjectCard } from "@/components/project/project-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getTranslations } from "@/lib/i18n-server";
import type { ProjectCardData } from "@/types/projects";

export async function ProjectGrid({
  projects,
  showEmptyAction = true,
}: {
  projects: ProjectCardData[];
  showEmptyAction?: boolean;
}) {
  const { t } = await getTranslations();
  if (!projects.length) {
    return (
      <EmptyState
        icon={Boxes}
        title={t("The launchpad is ready")}
        description={t(
          "No approved products yet. Be the first builder to submit one for review.",
        )}
        action={
          showEmptyAction ? (
            <Button asChild>
              <Link href="/submit">{t("Submit a project")}</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} eager={index < 3} />
      ))}
    </div>
  );
}
