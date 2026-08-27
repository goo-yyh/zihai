import { UserFacingError } from "@/lib/errors";
import { MAX_CONTENT_IMAGES } from "@/lib/image-policy";

export const MIN_CONTENT_IMAGES = 1;
export { MAX_CONTENT_IMAGES } from "@/lib/image-policy";

export type ProjectContentStatus =
  "draft" | "pending" | "approved" | "rejected" | "archived";

type ContentEditPatch = {
  status: ProjectContentStatus;
  rejectionReason: null;
  submittedAt: Date | null;
  approvedAt: null;
  approvedBy: null;
  updatedAt: Date;
};

/**
 * Every public-field edit invalidates the previous moderation decision.
 * Keeping this transition in one place prevents text edits and image edits
 * from drifting into different lifecycle behavior.
 */
export function contentEditPatch(
  currentStatus: ProjectContentStatus,
  now = new Date(),
): ContentEditPatch {
  if (currentStatus === "approved" || currentStatus === "pending") {
    return {
      status: "pending",
      rejectionReason: null,
      submittedAt: now,
      approvedAt: null,
      approvedBy: null,
      updatedAt: now,
    };
  }

  if (currentStatus === "rejected") {
    return {
      status: "draft",
      rejectionReason: null,
      submittedAt: null,
      approvedAt: null,
      approvedBy: null,
      updatedAt: now,
    };
  }

  return {
    status: currentStatus,
    rejectionReason: null,
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    updatedAt: now,
  };
}

export function assertSubmittable(status: ProjectContentStatus) {
  if (status !== "draft" && status !== "rejected") {
    throw new UserFacingError(
      "Only draft or rejected projects can be submitted.",
    );
  }
}

export function assertImageCount(count: number) {
  if (count < MIN_CONTENT_IMAGES || count > MAX_CONTENT_IMAGES) {
    throw new UserFacingError(
      `Project must have between ${MIN_CONTENT_IMAGES} and ${MAX_CONTENT_IMAGES} images.`,
    );
  }
}
