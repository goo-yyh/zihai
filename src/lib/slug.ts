export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function withSlugSuffix(base: string, attempt: number) {
  const fallback = base || "project";
  return attempt === 0 ? fallback : `${fallback}-${attempt + 1}`;
}
