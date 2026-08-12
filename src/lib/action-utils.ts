import type { ZodError } from "zod";

import type { ActionState } from "@/types/actions";

export function validationError(error: ZodError): ActionState {
  return {
    status: "error",
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

export function safeActionError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): ActionState {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("username") && (message.includes("taken") || message.includes("exist"))) {
      return { status: "error", message: "Username already taken." };
    }
    if (
      [
        "unauthorized",
        "forbidden",
        "not found",
        "complete onboarding before continuing.",
        "project must have between 1 and 3 images.",
        "iteration must have between 1 and 3 images.",
        "only pending content can be reviewed.",
        "at least one administrator is required.",
        "you cannot ban your own account.",
      ].includes(message)
    ) {
      return { status: "error", message: error.message };
    }
  }
  return { status: "error", message: fallback };
}
