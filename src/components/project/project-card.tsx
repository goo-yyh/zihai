import { Code2, ExternalLink, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { truncate } from "@/lib/utils";

export type ProjectCardData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  websiteUrl: string | null;
  githubUrl: string | null;
  imageUrl: string;
  ownerUsername: string | null;
  ownerImage: string | null;
  likeCount: number;
};

export function ProjectCard({ project }: { project: ProjectCardData }) {
  return (
    <article className="group overflow-hidden rounded-2xl border bg-white shadow-[0_8px_30px_rgb(27_34_9/5%)] transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgb(27_34_9/10%)]">
      <Link href={`/p/${project.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <Image
            src={project.imageUrl}
            alt={`${project.name} screenshot`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute right-3 top-3 rounded-full border bg-white/90 p-2 shadow-sm backdrop-blur">
            {project.githubUrl ? (
              <Code2 className="size-4" />
            ) : (
              <ExternalLink className="size-4" />
            )}
          </span>
        </div>
        <div className="p-5">
          <h3 className="text-lg font-bold tracking-tight group-hover:text-primary">
            {project.name}
          </h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
            {truncate(project.description.replace(/[#*_`]/g, ""), 110)}
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
            <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Avatar
                src={project.ownerImage}
                alt={project.ownerUsername || "Builder"}
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
