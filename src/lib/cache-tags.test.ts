import { describe, expect, it } from "vitest";

import {
  PUBLIC_PROJECT_DETAILS_TAG,
  PUBLIC_PROJECT_LIST_TAG,
  PUBLIC_SITEMAP_TAG,
  publicProfileTag,
  publicProjectTag,
} from "@/lib/cache-tags";

describe("public cache tags", () => {
  it("keeps list, detail, and sitemap cache scopes independent", () => {
    expect(
      new Set([
        PUBLIC_PROJECT_LIST_TAG,
        PUBLIC_PROJECT_DETAILS_TAG,
        PUBLIC_SITEMAP_TAG,
      ]).size,
    ).toBe(3);
  });

  it("creates stable resource tags", () => {
    expect(publicProjectTag("example-product")).toBe(
      "public-project:example-product",
    );
    expect(publicProfileTag("Example_Builder")).toBe(
      "public-profile:example_builder",
    );
  });
});
