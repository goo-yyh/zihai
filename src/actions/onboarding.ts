"use server";

import "server-only";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { account, user } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import { auth } from "@/lib/auth";
import { safeReturnPath } from "@/lib/navigation";
import { assertUser } from "@/lib/session";
import { passwordSchema, usernameSchema } from "@/lib/validations";
import type { ActionState } from "@/types/actions";

const onboardingSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    next: z.string().optional(),
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
    next: formData.get("next"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const requestHeaders = await headers();
    const [freshUser, credential] = await Promise.all([
      db
        .select({ image: user.image })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1),
      db
        .select({ id: account.id })
        .from(account)
        .where(
          and(
            eq(account.userId, session.user.id),
            eq(account.providerId, "credential"),
          ),
        )
        .limit(1),
    ]);
    if (!freshUser[0]?.image) {
      return {
        status: "error",
        message: "Choose your OAuth avatar or upload a custom avatar.",
      };
    }

    await auth.api.updateUser({
      headers: requestHeaders,
      body: {
        name: parsed.data.username,
        username: parsed.data.username,
        displayUsername: parsed.data.username,
      },
    });
    if (!credential[0]) {
      await auth.api.setPassword({
        headers: requestHeaders,
        body: { newPassword: parsed.data.password },
      });
    }

    await db
      .update(user)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));
  } catch (error) {
    return safeActionError(error, "Unable to finish onboarding.");
  }

  redirect(parsed.data.next ? safeReturnPath(parsed.data.next) : "/dashboard");
}
