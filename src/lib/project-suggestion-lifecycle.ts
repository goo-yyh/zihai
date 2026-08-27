import { UserFacingError } from "@/lib/errors";

export const PROJECT_SUGGESTION_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "completed",
] as const;

export type ProjectSuggestionStatus =
  (typeof PROJECT_SUGGESTION_STATUSES)[number];

export function projectSuggestionStatusLabel(status: ProjectSuggestionStatus) {
  const labels = {
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
    completed: "Completed",
  } as const;
  return labels[status];
}

export function assertProjectSuggestionTransition(
  current: ProjectSuggestionStatus,
  next: ProjectSuggestionStatus,
) {
  const allowed =
    (current === "pending" && (next === "accepted" || next === "rejected")) ||
    (current === "accepted" && next === "completed");

  if (!allowed) {
    throw new UserFacingError("This suggestion can no longer be updated.");
  }
}

export function assertProjectSuggestionRejectionReason(reason: string) {
  const normalized = reason.trim();
  if (normalized.length < 3 || normalized.length > 2000) {
    throw new UserFacingError(
      "Rejection reason must be between 3 and 2,000 characters.",
    );
  }
  return normalized;
}
