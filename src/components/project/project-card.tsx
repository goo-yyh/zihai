"use client";

import { Heart } from "lucide-react";
import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { ProductScreenshot } from "@/components/project/product-screenshot";
import { Avatar } from "@/components/ui/avatar";
import { ChromeIcon, GitHubIcon } from "@/components/ui/brand-icons";
import { publicProjectPath } from "@/lib/public-routes";
import type { ProjectCardData } from "@/types/projects";

export function ProjectCard({
  project,
  eager = false,
}: {
  project: ProjectCardData;
  eager?: boolean;
}) {
  const { t } = useI18n();
  return (
    <article className="group overflow-hidden rounded-2xl border bg-white shadow-[0_8px_30px_rgb(27_34_9/5%)] transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgb(27_34_9/10%)]">
      <Link
        href={publicProjectPath(project)}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <ProductScreenshot
            src={project.imageUrl}
            alt={`${project.name} screenshot`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading={eager ? "eager" : "lazy"}
            className="transition-opacity duration-300 group-hover:opacity-95"
          />
          <span className="absolute right-3 top-3 flex gap-1.5 rounded-full border bg-white/90 p-2 shadow-sm backdrop-blur">
            {project.websiteUrl ? <ChromeIcon className="size-4" /> : null}
            {project.githubUrl ? <GitHubIcon className="size-4" /> : null}
          </span>
        </div>
        <div className="p-5">
          <h3 className="text-lg font-bold tracking-tight group-hover:text-primary">
            {project.name}
          </h3>
          <p className="mt-2 line-clamp-3 h-[4.5rem] text-sm leading-6 text-muted-foreground">
            {project.description.replace(/[#*_`]/g, "")}
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
            <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Avatar
                src={project.ownerImage}
                alt={project.ownerUsername || t("Builder")}
                size={28}
              />
              <span className="truncate">
                @{project.ownerUsername || "builder"}
              </span>
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Heart className="size-3.5" /> {project.likeCount}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
