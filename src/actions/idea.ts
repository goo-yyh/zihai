"use server";

import "server-only";

import { getDb } from "@/db";
import { ideas } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import { assertOnboardedUser } from "@/lib/session";
import { ideaSubmissionSchema } from "@/lib/validations";
import { revalidateIdeaContent } from "@/server/cache";
import type { ActionState } from "@/types/actions";

export async function submitIdeaAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertOnboardedUser();
  const parsed = ideaSubmissionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    await getDb().insert(ideas).values({
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
    });
    revalidateIdeaContent();
    return { status: "success", message: "idea submitted." };
  } catch (error) {
    return safeActionError(error, "Unable to submit your idea.");
  }
}
