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

const DETERMINISTIC_SLUG_ATTEMPTS = 25;

export async function insertWithUniqueSlug<T>(
  value: string,
  insert: (slug: string) => Promise<T | undefined>,
  randomSuffix = () => crypto.randomUUID().slice(0, 8),
) {
  const base = slugify(value);

  for (let attempt = 0; attempt <= DETERMINISTIC_SLUG_ATTEMPTS; attempt += 1) {
    const slug =
      attempt < DETERMINISTIC_SLUG_ATTEMPTS
        ? withSlugSuffix(base, attempt)
        : `${base || "project"}-${randomSuffix()}`;
    const inserted = await insert(slug);
    if (inserted !== undefined) {
      return { inserted, attempts: attempt + 1 };
    }
  }

  throw new Error("Unable to allocate a unique project slug.");
}
