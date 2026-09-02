"use client";

import { Heart } from "lucide-react";
import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { ProductScreenshot } from "@/components/project/product-screenshot";
import { ProjectQrCodeButton } from "@/components/project/project-qr-code-button";
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
    <article className="group relative overflow-hidden rounded-2xl border bg-white shadow-[0_8px_30px_rgb(27_34_9/5%)] transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgb(27_34_9/10%)]">
      <Link
        href={publicProjectPath(project)}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
        <span className="sr-only">
          {t("Open project")}: {project.name}
        </span>
      </Link>

      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <ProductScreenshot
          src={project.imageUrl}
          alt={`${project.name} screenshot`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading={eager ? "eager" : "lazy"}
          className="transition-opacity duration-300 group-hover:opacity-95"
        />
        <span className="absolute right-3 top-3 z-20 flex gap-2">
          {project.websiteUrl ? (
            <a
              href={project.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("Visit product")}
              title={t("Visit product")}
              className="inline-flex size-10 items-center justify-center rounded-full border bg-white/90 text-foreground shadow-sm backdrop-blur transition hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ChromeIcon aria-hidden="true" className="size-4" />
            </a>
          ) : null}
          {project.githubUrl ? (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("View code")}
              title={t("View code")}
              className="inline-flex size-10 items-center justify-center rounded-full border bg-white/90 text-foreground shadow-sm backdrop-blur transition hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <GitHubIcon aria-hidden="true" className="size-4" />
            </a>
          ) : null}
          {project.qrCodeUrl ? (
            <ProjectQrCodeButton
              qrCodeUrl={project.qrCodeUrl}
              projectName={project.name}
              iconOnly
              className="cursor-pointer"
            />
          ) : null}
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
    </article>
  );
}
