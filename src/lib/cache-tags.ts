export const PUBLIC_PROJECT_LIST_TAG = "public-project-list";
export const PUBLIC_PROJECT_DETAILS_TAG = "public-project-details";
export const PUBLIC_SITEMAP_TAG = "public-sitemap";

export function publicProjectTag(slug: string) {
  return `public-project:${slug}`;
}

export function publicProfileTag(username: string) {
  return `public-profile:${username.toLowerCase()}`;
}
