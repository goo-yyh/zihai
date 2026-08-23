import { describe, expect, it } from "vitest";

import { DEFAULT_AVATAR_SRC } from "@/lib/avatar";
import {
  mapGitHubProfileToUser,
  mapGoogleProfileToUser,
} from "@/lib/oauth-profile";

describe("OAuth profile mapping", () => {
  it("uses the project default instead of the GitHub avatar", () => {
    expect(
      mapGitHubProfileToUser({
        id: 12345,
        email: "  builder@example.com  ",
      }),
    ).toEqual({
      email: "builder@example.com",
      image: DEFAULT_AVATAR_SRC,
    });
  });

  it("keeps GitHub's internal email fallback with the default avatar", () => {
    expect(mapGitHubProfileToUser({ id: 12345, email: null })).toEqual({
      email: "github-12345@github.zihai.invalid",
      image: DEFAULT_AVATAR_SRC,
    });
  });

  it("uses the project default instead of the Google avatar", () => {
    expect(mapGoogleProfileToUser()).toEqual({ image: DEFAULT_AVATAR_SRC });
  });
});
