import { UserFacingError } from "@/lib/errors";

export const IDEA_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "completed",
] as const;

export type IdeaStatus = (typeof IDEA_STATUSES)[number];

const statusLabels: Record<IdeaStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Not accepted",
  completed: "Completed",
};

const allowedTransitions: Record<IdeaStatus, readonly IdeaStatus[]> = {
  pending: ["accepted", "rejected"],
  accepted: ["completed"],
  rejected: [],
  completed: [],
};

export function canTransitionIdea(
  currentStatus: IdeaStatus,
  nextStatus: IdeaStatus,
) {
  return allowedTransitions[currentStatus].includes(nextStatus);
}

export function ideaStatusLabel(status: IdeaStatus) {
  return statusLabels[status];
}

export function assertIdeaTransition(
  currentStatus: IdeaStatus,
  nextStatus: IdeaStatus,
) {
  if (canTransitionIdea(currentStatus, nextStatus)) return;

  if (nextStatus === "completed") {
    throw new UserFacingError("Only accepted ideas can be completed.");
  }
  throw new UserFacingError("Only pending ideas can be reviewed.");
}
