"use client";

import { Compass } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";

type PoolProject = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

const RECOMMENDATION_COUNT = 5;

// The pick happens in client state on mount: likes and other Server Action
// revalidations re-render the page but keep this component's state, so the
// list only reshuffles on a real page load or navigation.
export function RecommendedProjects({ pool }: { pool: PoolProject[] }) {
  const { t } = useI18n();
  const [projects] = useState(() => {
    const candidates = [...pool];
    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[swap]] = [
        candidates[swap],
        candidates[index],
      ];
    }
    return candidates.slice(0, RECOMMENDATION_COUNT);
  });

  if (!projects.length) return null;

  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Compass className="size-4 text-primary" /> {t("More to explore")}
      </div>
      <ul className="mt-4 space-y-4">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/p/${project.slug}`}
              className="flex items-center gap-3 rounded-xl p-1 hover:bg-muted"
            >
              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
                {project.imageUrl ? (
                  <Image
                    src={project.imageUrl}
                    alt={project.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <span className="min-w-0 truncate text-sm font-bold hover:text-primary">
                {project.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
