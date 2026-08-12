"use server";

import "server-only";

import { del } from "@vercel/blob";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  account,
  iterationImages,
  projectImages,
  projectIterations,
  projects,
  user,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { safeActionError, validationError } from "@/lib/action-utils";
import { getServerEnv } from "@/lib/env";
import { safeReturnPath } from "@/lib/navigation";
import { assertOnboardedUser, assertUser } from "@/lib/session";
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
  const current = await assertUser();
  if (current.user.onboardingCompleted) redirect("/dashboard");

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
        .where(eq(user.id, current.user.id))
        .limit(1),
      db
        .select({ id: account.id })
        .from(account)
        .where(
          and(
            eq(account.userId, current.user.id),
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
      .where(eq(user.id, current.user.id));
  } catch (error) {
    return safeActionError(error, "Unable to finish onboarding.");
  }

  redirect(parsed.data.next ? safeReturnPath(parsed.data.next) : "/dashboard");
}

export async function updateProfileAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await assertOnboardedUser();
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const oldUsername = current.user.username;
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: parsed.data,
        username: parsed.data,
        displayUsername: parsed.data,
      },
    });
    if (oldUsername) revalidatePath(`/u/${oldUsername}`);
    revalidatePath(`/u/${parsed.data}`);
    revalidatePath("/");
    return { status: "success", message: "Profile updated." };
  } catch (error) {
    return safeActionError(error, "Unable to update your profile.");
  }
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export async function changePasswordAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertOnboardedUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
    });
    return { status: "success", message: "Password changed." };
  } catch {
    return {
      status: "error",
      message: "Current password is incorrect or the password could not be changed.",
    };
  }
}

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}

export async function deleteAccountAction(formData: FormData) {
  const current = await assertOnboardedUser();
  const confirmation = z.literal("DELETE").parse(formData.get("confirmation"));
  if (confirmation !== "DELETE") throw new Error("Confirmation required.");

  const [ownedProjects, ownedIterations, avatar] = await Promise.all([
    db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, current.user.id)),
    db
      .select({ id: projectIterations.id })
      .from(projectIterations)
      .where(eq(projectIterations.ownerId, current.user.id)),
    db
      .select({ pathname: user.avatarPathname })
      .from(user)
      .where(eq(user.id, current.user.id))
      .limit(1),
  ]);

  const projectIds = ownedProjects.map((item) => item.id);
  const iterationIds = ownedIterations.map((item) => item.id);
  const [projectPaths, iterationPaths] = await Promise.all([
    projectIds.length
      ? db
          .select({ pathname: projectImages.blobPathname })
          .from(projectImages)
          .where(inArray(projectImages.projectId, projectIds))
      : Promise.resolve([]),
    iterationIds.length
      ? db
          .select({ pathname: iterationImages.blobPathname })
          .from(iterationImages)
          .where(inArray(iterationImages.iterationId, iterationIds))
      : Promise.resolve([]),
  ]);
  const pathnames = [
    ...(avatar[0]?.pathname ? [avatar[0].pathname] : []),
    ...projectPaths.map((item) => item.pathname),
    ...iterationPaths.map((item) => item.pathname),
  ];
  if (pathnames.length) {
    await del(pathnames, { token: getServerEnv().BLOB_READ_WRITE_TOKEN });
  }

  await auth.api.signOut({ headers: await headers() });
  await db.delete(user).where(eq(user.id, current.user.id));
  revalidatePath("/");
  redirect("/?account=deleted");
}
