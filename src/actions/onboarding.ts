"use server";

import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { user } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import { avatarSrc, DEFAULT_AVATAR_SRC } from "@/lib/avatar";
import { safeReturnPath } from "@/lib/navigation";
import { assertUser } from "@/lib/session";
import { contactEmailSchema, usernameSchema } from "@/lib/validations";
import { revalidateUserPresentation } from "@/server/cache";
import type { ActionState } from "@/types/actions";

const onboardingSchema = z.object({
  username: usernameSchema,
  contactEmail: contactEmailSchema,
  next: z.string().optional(),
  useDefaultAvatar: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export async function completeOnboardingAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertUser();
  if (session.user.onboardingCompleted) redirect("/dashboard");

  const parsed = onboardingSchema.safeParse({
    username: formData.get("username"),
    contactEmail: formData.get("contactEmail"),
    next: formData.get("next"),
    useDefaultAvatar: formData.get("useDefaultAvatar") || undefined,
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const freshUser = await getDb()
      .select({ image: user.image })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    await getDb()
      .update(user)
      .set({
        name: parsed.data.username,
        username: parsed.data.username,
        displayUsername: parsed.data.username,
        image: parsed.data.useDefaultAvatar
          ? DEFAULT_AVATAR_SRC
          : avatarSrc(freshUser[0]?.image),
        contactEmail: parsed.data.contactEmail,
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));
    revalidateUserPresentation(undefined, parsed.data.username);
  } catch (error) {
    return safeActionError(error, "Unable to finish onboarding.");
  }

  redirect(parsed.data.next ? safeReturnPath(parsed.data.next) : "/dashboard");
}
