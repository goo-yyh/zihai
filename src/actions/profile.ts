"use server";

import "server-only";

import { headers } from "next/headers";

import { safeActionError, validationError } from "@/lib/action-utils";
import { auth } from "@/lib/auth";
import { assertOnboardedUser } from "@/lib/session";
import { usernameSchema } from "@/lib/validations";
import { revalidateUserPresentation } from "@/server/cache";
import type { ActionState } from "@/types/actions";

export async function updateProfileAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertOnboardedUser();
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) return validationError(parsed.error);

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: parsed.data,
        username: parsed.data,
        displayUsername: parsed.data,
      },
    });
    revalidateUserPresentation(session.user.username, parsed.data);
    return { status: "success", message: "Profile updated." };
  } catch (error) {
    return safeActionError(error, "Unable to update your profile.");
  }
}
