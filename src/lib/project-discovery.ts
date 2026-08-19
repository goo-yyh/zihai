import { z } from "zod";

import { PUBLIC_PROJECT_SORTS } from "@/types/projects";

export const DEFAULT_PUBLIC_PROJECT_SORT = "latest";
export const PUBLIC_PROJECT_PAGE_SIZE = 12;
export const MAX_PUBLIC_PROJECT_SEARCH_LENGTH = 100;
export const MAX_PUBLIC_PROJECT_PAGE = 10_000;
export const MAX_PUBLIC_PROJECT_SEARCH_TERMS = 8;

export const projectDiscoveryParamsSchema = z.object({
  sort: z.enum(PUBLIC_PROJECT_SORTS).default(DEFAULT_PUBLIC_PROJECT_SORT),
  query: z.string().trim().max(MAX_PUBLIC_PROJECT_SEARCH_LENGTH).default(""),
  page: z.coerce.number().int().min(1).max(MAX_PUBLIC_PROJECT_PAGE).default(1),
});

export const publicProjectPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string(),
      websiteUrl: z.string().nullable(),
      githubUrl: z.string().nullable(),
      imageUrl: z.string(),
      ownerUsername: z.string().nullable(),
      ownerImage: z.string().nullable(),
      likeCount: z.number(),
    }),
  ),
  nextPage: z.number().int().positive().nullable(),
  totalCount: z.number().int().nonnegative(),
});

export function projectSearchPatterns(query: string) {
  return Array.from(
    new Set(
      query
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, MAX_PUBLIC_PROJECT_SEARCH_TERMS),
    ),
  ).map((term) => "%" + term.replace(/[\\%_]/g, "\\$&") + "%");
}
