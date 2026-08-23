"use server";

import "server-only";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { withTransaction } from "@/db";
import { ideas, moderationLogs } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import { UserFacingError } from "@/lib/errors";
import { assertIdeaTransition } from "@/lib/idea-lifecycle";
import { assertAdmin } from "@/lib/session";
import { ideaCompletionSchema, rejectionSchema } from "@/lib/validations";
import { revalidateIdeaContent } from "@/server/cache";
import type { ActionState } from "@/types/actions";

const idSchema = z.uuid();

export async function acceptIdeaAction(ideaId: string) {
  const session = await assertAdmin();
  const id = idSchema.parse(ideaId);

  await withTransaction(async (tx) => {
    const [idea] = await tx
      .select({ status: ideas.status })
      .from(ideas)
      .where(eq(ideas.id, id))
      .for("update");
    if (!idea) throw new UserFacingError("idea not found.");
    assertIdeaTransition(idea.status, "accepted");

    const now = new Date();
    await tx
      .update(ideas)
      .set({
        status: "accepted",
        rejectionReason: null,
        reviewedAt: now,
        reviewedBy: session.user.id,
        updatedAt: now,
      })
      .where(and(eq(ideas.id, id), eq(ideas.status, "pending")));
    await tx.insert(moderationLogs).values({
      adminId: session.user.id,
      targetType: "idea",
      targetId: id,
      action: "accept_idea",
    });
  });

  revalidateIdeaContent(id);
  redirect(`/admin/ideas/${id}?accepted=1`);
}

export async function rejectIdeaAction(
  ideaId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertAdmin();
  const id = idSchema.parse(ideaId);
  const parsed = rejectionSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return validationError(parsed.error);

  try {
    await withTransaction(async (tx) => {
      const [idea] = await tx
        .select({ status: ideas.status })
        .from(ideas)
        .where(eq(ideas.id, id))
        .for("update");
      if (!idea) throw new UserFacingError("idea not found.");
      assertIdeaTransition(idea.status, "rejected");

      const now = new Date();
      await tx
        .update(ideas)
        .set({
          status: "rejected",
          rejectionReason: parsed.data.reason,
          reviewedAt: now,
          reviewedBy: session.user.id,
          updatedAt: now,
        })
        .where(and(eq(ideas.id, id), eq(ideas.status, "pending")));
      await tx.insert(moderationLogs).values({
        adminId: session.user.id,
        targetType: "idea",
        targetId: id,
        action: "reject_idea",
        reason: parsed.data.reason,
      });
    });

    revalidateIdeaContent(id);
    return { status: "success", message: "idea rejected." };
  } catch (error) {
    return safeActionError(error, "Unable to reject the idea.");
  }
}

export async function completeIdeaAction(
  ideaId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertAdmin();
  const id = idSchema.parse(ideaId);
  const parsed = ideaCompletionSchema.safeParse({
    websiteUrl: formData.get("websiteUrl"),
    githubUrl: formData.get("githubUrl"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    await withTransaction(async (tx) => {
      const [idea] = await tx
        .select({ status: ideas.status })
        .from(ideas)
        .where(eq(ideas.id, id))
        .for("update");
      if (!idea) throw new UserFacingError("idea not found.");
      assertIdeaTransition(idea.status, "completed");

      const now = new Date();
      await tx
        .update(ideas)
        .set({
          status: "completed",
          resultUrl: parsed.data.websiteUrl,
          githubUrl: parsed.data.githubUrl,
          completedAt: now,
          completedBy: session.user.id,
          updatedAt: now,
        })
        .where(and(eq(ideas.id, id), eq(ideas.status, "accepted")));
      await tx.insert(moderationLogs).values({
        adminId: session.user.id,
        targetType: "idea",
        targetId: id,
        action: "complete_idea",
        metadata: {
          websiteUrl: parsed.data.websiteUrl,
          githubUrl: parsed.data.githubUrl,
        },
      });
    });

    revalidateIdeaContent(id);
    return { status: "success", message: "idea marked as completed." };
  } catch (error) {
    return safeActionError(error, "Unable to complete the idea.");
  }
}
