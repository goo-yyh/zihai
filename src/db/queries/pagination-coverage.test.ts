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
  it("keeps Idea and private suggestion pages at ten items", () => {
    const dashboardQueries = source("./dashboard.ts");
    const dashboardIdeasPage = source("../../app/dashboard/ideas/page.tsx");
    const suggestionQueries = source("./project-suggestions.ts");
    const dashboardSuggestionsPage = source(
      "../../app/dashboard/suggestions/page.tsx",
    );
    const adminIdeasPage = source("../../app/admin/ideas/page.tsx");

    expect(dashboardQueries).toContain("options.pageSize ?? 10");
    expect(dashboardQueries).toContain(".limit(pageSize + 1)");
    expect(dashboardIdeasPage).toContain("pageSize: 10");
    expect(dashboardIdeasPage).toContain("ideaPage.items");
    expect(dashboardIdeasPage).toContain("<CursorPagination");
    expect(suggestionQueries).toContain("options.pageSize ?? 10");
    expect(dashboardSuggestionsPage.match(/pageSize: 10/g)).toHaveLength(2);
    expect(adminIdeasPage).toContain("pageSize: 10");
  });

  it("preserves database microseconds in every timestamp cursor query", () => {
    const cursorQueries = source("./cursor-pagination.ts");
    const paginatedQueries = [
      source("./admin.ts"),
      source("./dashboard.ts"),
      source("./notifications.ts"),
      source("./project-suggestions.ts"),
    ];

    expect(cursorQueries).toContain("AT TIME ZONE 'UTC'");
    expect(cursorQueries).toContain("::timestamptz");
    expect(cursorQueries).toContain("createTimestampCursorPage");
    for (const querySource of paginatedQueries) {
      expect(querySource).toContain("createTimestampCursorPage");
      expect(querySource).not.toContain("new Date(cursor.sortValue)");
    }
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
