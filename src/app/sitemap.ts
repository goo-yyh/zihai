import type { MetadataRoute } from "next";

import { getSitemapEntries } from "@/db/queries/public";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const entries = await getSitemapEntries();
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...entries.projects.map((project) => ({ url: `${base}/p/${project.slug}`, lastModified: project.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...entries.users.map((profile) => ({ url: `${base}/u/${profile.username}`, lastModified: profile.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
