"use server";

import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { user } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import { assertOnboardedUser, refreshSessionCookieCache } from "@/lib/session";
import { contactEmailSchema, usernameSchema } from "@/lib/validations";
import { revalidateUserPresentation } from "@/server/cache";
import type { ActionState } from "@/types/actions";

const profileSchema = z.object({
  username: usernameSchema,
  contactEmail: contactEmailSchema,
});

export async function updateProfileAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertOnboardedUser();
  const parsed = profileSchema.safeParse({
    username: formData.get("username"),
    contactEmail: formData.get("contactEmail"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    await getDb()
      .update(user)
      .set({
        name: parsed.data.username,
        username: parsed.data.username,
        displayUsername: parsed.data.username,
        contactEmail: parsed.data.contactEmail,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));
    await refreshSessionCookieCache();
    revalidateUserPresentation(session.user.username, parsed.data.username);
    return { status: "success", message: "Profile updated." };
  } catch (error) {
    return safeActionError(error, "Unable to update your profile.");
  }
}
