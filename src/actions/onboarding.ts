"use server";

import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { hasCredentialAccount } from "@/db/queries/account";
import { user } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import { avatarSrc, DEFAULT_AVATAR_SRC } from "@/lib/avatar";
import { getAuth } from "@/lib/auth";
import { safeReturnPath } from "@/lib/navigation";
import { assertUser, refreshSessionCookieCache } from "@/lib/session";
import {
  contactEmailSchema,
  passwordSchema,
  usernameSchema,
} from "@/lib/validations";
import { revalidateUserPresentation } from "@/server/cache";
import type { ActionState } from "@/types/actions";

const onboardingSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    contactEmail: contactEmailSchema,
    next: z.string().optional(),
    useDefaultAvatar: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export async function completeOnboardingAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertUser();
  if (session.user.onboardingCompleted) redirect("/dashboard");

  const parsed = onboardingSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    contactEmail: formData.get("contactEmail"),
    next: formData.get("next"),
    useDefaultAvatar: formData.get("useDefaultAvatar") || undefined,
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const [freshUser, hasPassword] = await Promise.all([
      getDb()
        .select({ image: user.image })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1),
      hasCredentialAccount(session.user.id),
    ]);
    if (!hasPassword) {
      await getAuth().api.setPassword({
        headers: await headers(),
        body: { newPassword: parsed.data.password },
      });
    }
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
    await refreshSessionCookieCache();
    revalidateUserPresentation(
      session.user.id,
      undefined,
      parsed.data.username,
    );
  } catch (error) {
    return safeActionError(error, "Unable to finish onboarding.");
  }

  redirect(parsed.data.next ? safeReturnPath(parsed.data.next) : "/dashboard");
}
