import type { ZodError } from "zod";

import { isUserFacingError } from "@/lib/errors";
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
  if (isUserFacingError(error)) {
    return { status: "error", message: error.message };
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("username") &&
      (message.includes("taken") || message.includes("exist"))
    ) {
      return { status: "error", message: "Username already taken." };
    }
  }

  console.error("Server action failed", error);
  return { status: "error", message: fallback };
}
