"use server";

import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { withTransaction } from "@/db";
import { projectSuggestions, projects } from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import { UserFacingError } from "@/lib/errors";
import type { NotificationType } from "@/lib/notifications";
import { assertProjectSuggestionTransition } from "@/lib/project-suggestion-lifecycle";
import { assertOnboardedUser } from "@/lib/session";
import {
  projectSuggestionRejectionSchema,
  projectSuggestionSubmissionSchema,
} from "@/lib/validations";
import { revalidateProjectSuggestions } from "@/server/cache";
import { scheduleNotification } from "@/server/notifications";
import type { ActionState } from "@/types/actions";

const idSchema = z.uuid();

export async function submitProjectSuggestionAction(
  projectId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertOnboardedUser();
  const parsedId = idSchema.safeParse(projectId);
  if (!parsedId.success) {
    return { status: "error", message: "Invalid project." };
  }
  const parsed = projectSuggestionSubmissionSchema.safeParse({
    content: formData.get("content"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await withTransaction(async (tx) => {
      const [approvedProject] = await tx
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          ownerId: projects.ownerId,
          status: projects.status,
        })
        .from(projects)
        .where(eq(projects.id, parsedId.data))
        .for("update");
      if (!approvedProject || approvedProject.status !== "approved") {
        throw new UserFacingError(
          "Only approved projects can receive suggestions.",
        );
      }
      if (approvedProject.ownerId === session.user.id) {
        throw new UserFacingError(
          "You cannot submit a suggestion to your own project.",
        );
      }

      const [suggestion] = await tx
        .insert(projectSuggestions)
        .values({
          projectId: approvedProject.id,
          authorId: session.user.id,
          content: parsed.data.content,
        })
        .returning({ id: projectSuggestions.id });
      if (!suggestion) throw new Error("Suggestion insert returned no row.");

      return { project: approvedProject, suggestionId: suggestion.id };
    });

    scheduleNotification({
      recipientId: result.project.ownerId,
      actorId: session.user.id,
      type: "project_suggestion_received",
      projectId: result.project.id,
      suggestionId: result.suggestionId,
      payload: {
        projectName: result.project.name,
        actorName: session.user.username || session.user.name || "User",
        suggestionExcerpt: parsed.data.content.slice(0, 160),
      },
    });
    revalidateProjectSuggestions(result.project);
    return { status: "success", message: "Suggestion sent." };
  } catch (error) {
    return safeActionError(error, "Unable to send your suggestion.");
  }
}

type SuggestionTransitionTarget = "accepted" | "rejected" | "completed";

async function transitionSuggestion(
  suggestionId: string,
  nextStatus: SuggestionTransitionTarget,
  rejectionReason?: string,
) {
  const session = await assertOnboardedUser();
  const parsedId = idSchema.safeParse(suggestionId);
  if (!parsedId.success) throw new UserFacingError("Invalid suggestion.");

  const result = await withTransaction(async (tx) => {
    const [suggestion] = await tx
      .select({
        id: projectSuggestions.id,
        status: projectSuggestions.status,
        authorId: projectSuggestions.authorId,
        projectId: projectSuggestions.projectId,
        projectName: projects.name,
        projectSlug: projects.slug,
        ownerId: projects.ownerId,
      })
      .from(projectSuggestions)
      .innerJoin(projects, eq(projectSuggestions.projectId, projects.id))
      .where(eq(projectSuggestions.id, parsedId.data))
      .for("update");
    if (!suggestion) throw new UserFacingError("Suggestion not found.");
    if (suggestion.ownerId !== session.user.id) {
      throw new UserFacingError(
        "Only the project owner can update this suggestion.",
      );
    }
    assertProjectSuggestionTransition(suggestion.status, nextStatus);

    const now = new Date();
    const currentStatus = suggestion.status;
    const patch =
      nextStatus === "accepted"
        ? {
            status: "accepted" as const,
            respondedAt: now,
            respondedBy: session.user.id,
            rejectionReason: null,
            updatedAt: now,
          }
        : nextStatus === "rejected"
          ? {
              status: "rejected" as const,
              respondedAt: now,
              respondedBy: session.user.id,
              rejectionReason: rejectionReason ?? null,
              updatedAt: now,
            }
          : {
              status: "completed" as const,
              completedAt: now,
              completedBy: session.user.id,
              updatedAt: now,
            };
    const updated = await tx
      .update(projectSuggestions)
      .set(patch)
      .where(
        and(
          eq(projectSuggestions.id, parsedId.data),
          eq(projectSuggestions.status, currentStatus),
          sql`exists (
            select 1 from ${projects}
            where ${projects.id} = ${projectSuggestions.projectId}
              and ${projects.ownerId} = ${session.user.id}
          )`,
        ),
      )
      .returning({ id: projectSuggestions.id });
    if (!updated[0]) {
      throw new UserFacingError("This suggestion can no longer be updated.");
    }

    const notificationType: NotificationType =
      nextStatus === "accepted"
        ? "project_suggestion_accepted"
        : nextStatus === "rejected"
          ? "project_suggestion_rejected"
          : "project_suggestion_completed";

    return {
      project: {
        id: suggestion.projectId,
        slug: suggestion.projectSlug,
      },
      notification: {
        recipientId: suggestion.authorId,
        actorId: session.user.id,
        type: notificationType,
        projectId: suggestion.projectId,
        suggestionId: suggestion.id,
        payload: {
          projectName: suggestion.projectName,
          actorName: session.user.username || session.user.name || "User",
          rejectionReason,
        },
      },
    };
  });

  scheduleNotification(result.notification);
  revalidateProjectSuggestions(result.project);
}

export async function acceptProjectSuggestionAction(
  suggestionId: string,
): Promise<ActionState> {
  try {
    await transitionSuggestion(suggestionId, "accepted");
    return { status: "success", message: "Suggestion accepted." };
  } catch (error) {
    return safeActionError(error, "Unable to accept the suggestion.");
  }
}

export async function rejectProjectSuggestionAction(
  suggestionId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = projectSuggestionRejectionSchema.safeParse({
    reason: formData.get("reason"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    await transitionSuggestion(suggestionId, "rejected", parsed.data.reason);
    return { status: "success", message: "Suggestion rejected." };
  } catch (error) {
    return safeActionError(error, "Unable to reject the suggestion.");
  }
}

export async function completeProjectSuggestionAction(
  suggestionId: string,
): Promise<ActionState> {
  try {
    await transitionSuggestion(suggestionId, "completed");
    return { status: "success", message: "Suggestion completed." };
  } catch (error) {
    return safeActionError(error, "Unable to complete the suggestion.");
  }
}
