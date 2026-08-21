"use server";

import "server-only";

import { count, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { getDb, withTransaction } from "@/db";
import { moderationLogs, user } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { UserFacingError } from "@/lib/errors";
import { assertAdmin } from "@/lib/session";
import { revalidateAdminUsers } from "@/server/cache";

const userIdSchema = z.string().min(1);
const roleSchema = z.enum(["user", "admin"]);
const banReasonSchema = z.string().trim().min(3).max(500);

export async function setUserRoleAction(
  userId: string,
  requestedRole: "user" | "admin",
) {
  const session = await assertAdmin();
  const targetId = userIdSchema.parse(userId);
  const role = roleSchema.parse(requestedRole);

  await withTransaction(async (tx) => {
    // Serialize all role changes so two admins cannot both revoke the final
    // administrator after independently observing the same count.
    await tx.execute(sql`select pg_advisory_xact_lock(948217431)`);
    const [target] = await tx
      .select({ role: user.role, email: user.email })
      .from(user)
      .where(eq(user.id, targetId))
      .limit(1);
    if (!target) throw new UserFacingError("User not found.");
    if (target.role === role) return;

    if (target.role === "admin" && role === "user") {
      const [admins] = await tx
        .select({ value: count() })
        .from(user)
        .where(eq(user.role, "admin"));
      if ((admins?.value ?? 0) <= 1) {
        throw new UserFacingError("At least one administrator is required.");
      }
    }

    await tx
      .update(user)
      .set({ role, updatedAt: new Date() })
      .where(eq(user.id, targetId));
    await tx.insert(moderationLogs).values({
      adminId: session.user.id,
      targetType: "user",
      targetId,
      action: role === "admin" ? "promote_admin" : "revoke_admin",
      metadata: { email: target.email },
    });
  });

  revalidateAdminUsers();
}

export async function setUserBanAction(
  userId: string,
  banned: boolean,
  reason?: string,
) {
  const session = await assertAdmin();
  const targetId = userIdSchema.parse(userId);
  if (targetId === session.user.id && banned) {
    throw new UserFacingError("You cannot ban your own account.");
  }

  const normalizedReason = banned ? banReasonSchema.parse(reason) : undefined;
  if (banned) {
    await getAuth().api.banUser({
      headers: await headers(),
      body: { userId: targetId, banReason: normalizedReason },
    });
  } else {
    await getAuth().api.unbanUser({
      headers: await headers(),
      body: { userId: targetId },
    });
  }

  await getDb()
    .insert(moderationLogs)
    .values({
      adminId: session.user.id,
      targetType: "user",
      targetId,
      action: banned ? "ban_user" : "unban_user",
      reason: normalizedReason,
    });
  revalidateAdminUsers();
}
