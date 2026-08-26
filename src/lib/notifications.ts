export const NOTIFICATION_TYPES = [
  "project_liked",
  "project_suggestion_received",
  "project_suggestion_accepted",
  "project_suggestion_rejected",
  "project_suggestion_completed",
  "project_approved",
  "project_rejected",
  "project_archived",
  "project_republished",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationPayload = {
  projectName: string;
  actorName?: string;
  suggestionExcerpt?: string;
  rejectionReason?: string;
};

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  payload: NotificationPayload;
  projectId: string | null;
  suggestionId: string | null;
  actorId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  items: NotificationListItem[];
  previousCursor: string | null;
  nextCursor: string | null;
};

export function mergeNotificationItems(
  currentItems: NotificationListItem[],
  incomingItems: NotificationListItem[],
) {
  const knownIds = new Set(currentItems.map((item) => item.id));
  return [
    ...currentItems,
    ...incomingItems.filter((item) => !knownIds.has(item.id)),
  ];
}

export function shouldCreateNotification(
  recipientId: string,
  actorId: string | null | undefined,
) {
  return !actorId || recipientId !== actorId;
}

export function notificationBadgeLabel(count: number) {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

export function notificationMessage(
  type: NotificationType,
  payload: NotificationPayload,
): { message: string; values: Record<string, string | number> } {
  const actorName = payload.actorName || "Deleted user";
  switch (type) {
    case "project_liked":
      return {
        message: "{actor} liked {project}.",
        values: { actor: actorName, project: payload.projectName },
      };
    case "project_suggestion_received":
      return {
        message: "{actor} submitted a suggestion for {project}.",
        values: { actor: actorName, project: payload.projectName },
      };
    case "project_suggestion_accepted":
      return {
        message: "Your suggestion for {project} was accepted.",
        values: { project: payload.projectName },
      };
    case "project_suggestion_rejected":
      return {
        message: "Your suggestion for {project} was rejected.",
        values: { project: payload.projectName },
      };
    case "project_suggestion_completed":
      return {
        message: "Your suggestion for {project} was completed.",
        values: { project: payload.projectName },
      };
    case "project_approved":
      return {
        message: "Your project {project} was approved.",
        values: { project: payload.projectName },
      };
    case "project_rejected":
      return {
        message: "Your project {project} was rejected.",
        values: { project: payload.projectName },
      };
    case "project_archived":
      return {
        message: "Your project {project} was taken down.",
        values: { project: payload.projectName },
      };
    case "project_republished":
      return {
        message: "Your project {project} was republished.",
        values: { project: payload.projectName },
      };
  }
}

export function notificationTarget(
  type: NotificationType,
  projectId: string | null,
  suggestionId: string | null,
) {
  if (type.startsWith("project_suggestion_")) {
    if (!suggestionId) return null;
    const view =
      type === "project_suggestion_received" ? "received" : "submitted";
    return `/dashboard/suggestions?view=${view}&focus=${suggestionId}`;
  }
  return projectId ? `/dashboard/projects/${projectId}` : null;
}
