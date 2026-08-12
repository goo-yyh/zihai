import { Boxes } from "lucide-react";
import Link from "next/link";

import {
  ProjectCard,
  type ProjectCardData,
} from "@/components/project/project-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function ProjectGrid({ projects }: { projects: ProjectCardData[] }) {
  if (!projects.length) {
    return (
      <EmptyState
        icon={Boxes}
        title="The launchpad is ready"
        description="No approved products yet. Be the first builder to submit one for review."
        action={
          <Button asChild>
            <Link href="/submit">Submit a project</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
