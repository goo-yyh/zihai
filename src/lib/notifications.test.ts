import { describe, expect, it } from "vitest";

import {
  mergeNotificationItems,
  notificationBadgeLabel,
  notificationMessage,
  notificationTarget,
  NOTIFICATION_TYPES,
  shouldCreateNotification,
} from "@/lib/notifications";
import type { NotificationListItem } from "@/lib/notifications";

function notification(id: string): NotificationListItem {
  return {
    id,
    type: "project_liked",
    payload: { projectName: "Atlas" },
    projectId: "project",
    suggestionId: null,
    actorId: "actor",
    readAt: null,
    createdAt: "2026-08-27T00:00:00.000Z",
  };
}

describe("notification rules", () => {
  it("does not notify the actor about their own action", () => {
    expect(shouldCreateNotification("same", "same")).toBe(false);
    expect(shouldCreateNotification("owner", "actor")).toBe(true);
    expect(shouldCreateNotification("owner", null)).toBe(true);
  });

  it("formats the unread badge", () => {
    expect(notificationBadgeLabel(0)).toBeNull();
    expect(notificationBadgeLabel(12)).toBe("12");
    expect(notificationBadgeLabel(100)).toBe("99+");
  });

  it("appends cursor pages without reordering or duplicating notifications", () => {
    expect(
      mergeNotificationItems(
        [notification("newest"), notification("boundary")],
        [notification("boundary"), notification("oldest")],
      ).map((item) => item.id),
    ).toEqual(["newest", "boundary", "oldest"]);
  });

  it("maps every event to a controlled message", () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(
        notificationMessage(type, {
          projectName: "Atlas",
          actorName: "river",
        }).message,
      ).toBeTruthy();
    }
  });

  it("does not create links after the target is deleted", () => {
    expect(notificationTarget("project_liked", null, null)).toBeNull();
    expect(
      notificationTarget("project_suggestion_rejected", "project", null),
    ).toBeNull();
    expect(
      notificationTarget(
        "project_suggestion_received",
        "project",
        "suggestion",
      ),
    ).toContain("view=received");
  });
});
