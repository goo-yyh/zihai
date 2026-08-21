import { contactEmailSchema } from "@/lib/validations";

export const GITHUB_FALLBACK_EMAIL_DOMAIN = "github.zihai.invalid";

export function githubFallbackEmail(profileId: string | number) {
  const normalizedId = String(profileId)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `github-${normalizedId || "unknown"}@${GITHUB_FALLBACK_EMAIL_DOMAIN}`;
}

export function isGithubFallbackEmail(email?: string | null) {
  return Boolean(
    email?.trim().toLowerCase().endsWith(`@${GITHUB_FALLBACK_EMAIL_DOMAIN}`),
  );
}

export function getInitialContactEmail(
  savedContactEmail?: string | null,
  oauthEmail?: string | null,
) {
  for (const candidate of [savedContactEmail, oauthEmail]) {
    if (!candidate || isGithubFallbackEmail(candidate)) continue;
    const parsed = contactEmailSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }

  return "";
}
