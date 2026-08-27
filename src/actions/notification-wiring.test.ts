import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

describe("notification event wiring", () => {
  it("keeps notification persistence out of the atomic like query", () => {
    const likeAction = source("./like.ts");
    expect(likeAction).toContain("project_liked");
    expect(likeAction).not.toContain("INSERT INTO notifications");
    expect(likeAction.indexOf("await getDb().batch")).toBeLessThan(
      likeAction.indexOf("scheduleNotification({"),
    );
  });

  it("schedules every project moderation outcome without awaiting it", () => {
    const adminProject = source("./admin-project.ts");
    expect(adminProject).not.toContain("insertNotification");
    expect(adminProject).not.toContain("await scheduleNotification");
    for (const type of [
      "project_approved",
      "project_rejected",
      "project_archived",
      "project_republished",
    ]) {
      expect(adminProject).toContain(`type: "${type}"`);
    }
  });

  it("wires suggestion receipt and every owner response", () => {
    const suggestionAction = source("./project-suggestion.ts");
    expect(suggestionAction).not.toContain("insertNotification");
    expect(suggestionAction).not.toContain("await scheduleNotification");
    for (const type of [
      "project_suggestion_received",
      "project_suggestion_accepted",
      "project_suggestion_rejected",
      "project_suggestion_completed",
    ]) {
      expect(suggestionAction).toContain(type);
    }
  });

  it("runs best-effort persistence after the response and isolates failures", () => {
    const notificationService = source("../server/notifications.ts");
    expect(notificationService).toContain("after(async () =>");
    expect(notificationService).toContain("try {");
    expect(notificationService).toContain("catch (error)");
  });

  it("loads the badge after hydration and appends pages on scroll", () => {
    const siteHeader = source("../components/site-header.tsx");
    const button = source(
      "../components/notifications/notification-button.tsx",
    );
    const drawer = source(
      "../components/notifications/notification-drawer.tsx",
    );
    expect(siteHeader).not.toContain("getUnreadNotificationCount");
    expect(button).toContain("/api/notifications/unread-count");
    expect(button).toContain("mergeNotificationItems");
    expect(button).toContain('t("Notifications, {count} unread"');
    expect(button).toContain('aria-hidden="true"');
    expect(drawer).toContain("IntersectionObserver");
    expect(drawer).not.toContain('t("Previous")');
    expect(drawer).not.toContain('t("Next")');
  });

  it("consumes suggestion rejection results in the submitting action", () => {
    const suggestionList = source(
      "../components/dashboard/project-suggestion-list.tsx",
    );
    expect(suggestionList).toContain("action={rejectSuggestion}");
    expect(suggestionList).toContain("await rejectProjectSuggestionAction(");
    expect(suggestionList).not.toContain("useActionState");
    expect(suggestionList).not.toContain("useEffect");
  });
});
