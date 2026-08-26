import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

describe("public project page resilience", () => {
  it("caches the public recommendation pool across requests", () => {
    const publicQueries = source("./public.ts");
    expect(publicQueries).toContain("getCachedRecommendationPool");
    expect(publicQueries).toContain('"public-project-recommendation-pool"');
    expect(publicQueries).toContain("tags: [PUBLIC_PROJECT_LIST_TAG]");
  });

  it("keeps optional project sections from rejecting the page render", () => {
    const projectPage = source("../../app/p/[projectId]/[slug]/page.tsx");
    for (const section of [
      "project suggestion sidebar",
      "project recommendations",
      "project suggestion control",
      "project like control",
    ]) {
      expect(projectPage).toContain(`"${section}"`);
    }
    expect(projectPage).toContain("ProjectSectionUnavailable");
    expect(projectPage).toContain("ProjectPageUnavailable");
  });
});
