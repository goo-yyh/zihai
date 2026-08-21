import type { MetadataRoute } from "next";

import { getSitemapEntries } from "@/db/queries/public";
import { publicProfilePath, publicProjectPath } from "@/lib/public-routes";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const entries = await getSitemapEntries();
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...entries.projects.map((project) => ({
      url: `${base}${publicProjectPath(project)}`,
      lastModified: project.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...entries.users.map((profile) => ({
      url: `${base}${publicProfilePath(profile)}`,
      lastModified: profile.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
