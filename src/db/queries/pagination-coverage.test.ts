import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

describe("growing collection pagination", () => {
  it("bounds the user's Idea list with a stable cursor page", () => {
    const dashboardQueries = source("./dashboard.ts");
    const dashboardIdeasPage = source("../../app/dashboard/ideas/page.tsx");

    expect(dashboardQueries).toContain("function ideaCursorCondition");
    expect(dashboardQueries).toContain(".limit(pageSize + 1)");
    expect(dashboardQueries).toContain(
      "createCursorPage(rows, pageSize, cursor",
    );
    expect(dashboardIdeasPage).toContain("ideaPage.items");
    expect(dashboardIdeasPage).toContain("<CursorPagination");
  });

  it("bounds project and Idea moderation history", () => {
    const adminQueries = source("./admin.ts");
    const adminIdeaPage = source("../../app/admin/ideas/[id]/page.tsx");
    const adminProjectPage = source("../../app/admin/projects/[id]/page.tsx");

    expect(adminQueries).toContain("function moderationLogPageQuery");
    expect(adminQueries).toContain(
      'moderationLogPageQuery("idea", ideaId, options)',
    );
    expect(adminQueries).toContain(
      'moderationLogPageQuery("project", projectId, options)',
    );
    expect(adminIdeaPage).toContain("idea.logs.items");
    expect(adminIdeaPage).toContain("<CursorPagination");
    expect(adminProjectPage).toContain("project.logs.items");
    expect(adminProjectPage).toContain("<CursorPagination");
  });

  it("keeps public project suggestions on ten-item pages with visible controls", () => {
    const publicSuggestions = source("./project-suggestions.ts");
    const suggestionDrawer = source(
      "../../components/project/project-suggestions-drawer.tsx",
    );

    expect(publicSuggestions).toContain("options.pageSize ?? 10");
    expect(publicSuggestions).toContain(".limit(pageSize + 1)");
    expect(suggestionDrawer).toContain('limit: "10"');
    expect(suggestionDrawer).toContain("page ? (");
    expect(suggestionDrawer).toContain('t("Previous")');
    expect(suggestionDrawer).toContain('t("Next")');
  });
});
