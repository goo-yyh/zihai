import { DEFAULT_AVATAR_SRC } from "@/lib/avatar";
import { githubFallbackEmail } from "@/lib/contact-email";

type GitHubOAuthProfile = {
  id: string | number;
  email?: string | null;
};

export function mapGitHubProfileToUser(profile: GitHubOAuthProfile) {
  return {
    email: profile.email?.trim() || githubFallbackEmail(profile.id),
    image: DEFAULT_AVATAR_SRC,
  };
}

export function mapGoogleProfileToUser() {
  return { image: DEFAULT_AVATAR_SRC };
}
