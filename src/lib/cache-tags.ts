export const PUBLIC_PROJECT_LIST_TAG = "public-project-list";
export const PUBLIC_PROJECT_DETAILS_TAG = "public-project-details";
export const PUBLIC_SITEMAP_TAG = "public-sitemap";

export function publicProjectTag(projectId: string) {
  return `public-project:${projectId}`;
}

export function publicProfileTag(userId: string) {
  return `public-profile:${userId}`;
}
