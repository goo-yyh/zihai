import { describe, expect, it } from "vitest";

import {
  PUBLIC_PROJECT_DETAILS_TAG,
  PUBLIC_PROJECT_LIST_TAG,
  PUBLIC_PROJECT_SUGGESTIONS_TAG,
  PUBLIC_SITEMAP_TAG,
  publicProfileTag,
  publicProjectTag,
  publicProjectSuggestionsTag,
} from "@/lib/cache-tags";

describe("public cache tags", () => {
  it("keeps list, detail, and sitemap cache scopes independent", () => {
    expect(
      new Set([
        PUBLIC_PROJECT_LIST_TAG,
        PUBLIC_PROJECT_DETAILS_TAG,
        PUBLIC_PROJECT_SUGGESTIONS_TAG,
        PUBLIC_SITEMAP_TAG,
      ]).size,
    ).toBe(4);
  });

  it("creates stable resource tags", () => {
    expect(publicProjectTag("project-id")).toBe("public-project:project-id");
    expect(publicProfileTag("user-id")).toBe("public-profile:user-id");
    expect(publicProjectSuggestionsTag("project-id")).toBe(
      "public-project-suggestions:project-id",
    );
  });
});
