"use server";

import "server-only";

import { count, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb, withTransaction } from "@/db";
import { hasCredentialAccount } from "@/db/queries/account";
import { projectImages, projects, user } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { safeActionError, validationError } from "@/lib/action-utils";
import { UserFacingError } from "@/lib/errors";
import { assertOnboardedUser } from "@/lib/session";
import { passwordSchema } from "@/lib/validations";
import { deleteBlobsBestEffort } from "@/server/blob";
import { revalidateUserPresentation } from "@/server/cache";
import type { ActionState } from "@/types/actions";

const newPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

const changePasswordSchema = newPasswordSchema.and(
  z.object({
    currentPassword: z.string().min(1, "Enter your current password."),
  }),
);

export async function setPasswordAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertOnboardedUser();
  const parsed = newPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationError(parsed.error);

  if (await hasCredentialAccount(session.user.id)) {
    return { status: "error", message: "A password is already set." };
  }

  try {
    await getAuth().api.setPassword({
      headers: await headers(),
      body: { newPassword: parsed.data.newPassword },
    });
    return { status: "success", message: "Password set successfully." };
  } catch (error) {
    return safeActionError(error, "Unable to set password.");
  }
}

export async function changePasswordAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertOnboardedUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationError(parsed.error);

  if (!(await hasCredentialAccount(session.user.id))) {
    return { status: "error", message: "Set a password before changing it." };
  }

  try {
    await getAuth().api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
    });
    return { status: "success", message: "Password changed successfully." };
  } catch (error) {
    console.error("Unable to change password", error);
    return {
      status: "error",
      message:
        "Current password is incorrect or the password could not be changed.",
    };
  }
}

export async function deleteAccountAction(formData: FormData) {
  const session = await assertOnboardedUser();
  z.literal("DELETE").parse(formData.get("confirmation"));

  const [ownedProjects, avatar] = await Promise.all([
    getDb()
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, session.user.id)),
    getDb()
      .select({ pathname: user.avatarPathname })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1),
  ]);

  const projectIds = ownedProjects.map(({ id }) => id);
  const projectPaths = projectIds.length
    ? await getDb()
        .select({ pathname: projectImages.blobPathname })
        .from(projectImages)
        .where(inArray(projectImages.projectId, projectIds))
    : [];
  const pathnames = [
    ...(avatar[0]?.pathname ? [avatar[0].pathname] : []),
    ...projectPaths.map(({ pathname }) => pathname),
  ];

  if (session.user.role === "admin") {
    const [admins] = await getDb()
      .select({ value: count() })
      .from(user)
      .where(eq(user.role, "admin"));
    if ((admins?.value ?? 0) <= 1) {
      throw new UserFacingError(
        "Transfer administrator access before deleting the final admin account.",
      );
    }
  }

  await getAuth().api.signOut({ headers: await headers() });
  await withTransaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(948217431)`);
    const [freshUser] = await tx
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .for("update");
    if (!freshUser) return;

    if (freshUser.role === "admin") {
      const [admins] = await tx
        .select({ value: count() })
        .from(user)
        .where(eq(user.role, "admin"));
      if ((admins?.value ?? 0) <= 1) {
        throw new UserFacingError(
          "Transfer administrator access before deleting the final admin account.",
        );
      }
    }
    await tx.delete(user).where(eq(user.id, session.user.id));
  });

  await deleteBlobsBestEffort(pathnames);
  revalidateUserPresentation(session.user.id, session.user.username);
  redirect("/?account=deleted");
}
