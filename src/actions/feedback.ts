"use server";

import "server-only";

import { getDb } from "@/db";
import { feedback } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import { assertUser } from "@/lib/session";
import { feedbackSchema } from "@/lib/validations";
import type { ActionState } from "@/types/actions";

export async function submitFeedbackAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertUser();
  const parsed = feedbackSchema.safeParse({
    content: formData.get("content"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    await getDb()
      .insert(feedback)
      .values({ userId: session.user.id, content: parsed.data.content });
    return { status: "success", message: "Feedback sent." };
  } catch (error) {
    return safeActionError(error, "Unable to send feedback.");
  }
}
