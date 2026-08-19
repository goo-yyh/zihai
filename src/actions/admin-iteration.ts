"use server";

import "server-only";

import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  iterationImages,
  moderationLogs,
  projectIterations,
  projects,
} from "@/db/schema";
import { safeActionError, validationError } from "@/lib/action-utils";
import { assertImageCount } from "@/lib/content-lifecycle";
import { UserFacingError } from "@/lib/errors";
import { assertFeatureEnabled } from "@/lib/features";
import { assertAdmin } from "@/lib/session";
import { rejectionSchema } from "@/lib/validations";
import {
  revalidateAdminContent,
  revalidateProjectDetail,
} from "@/server/cache";
import type { ActionState } from "@/types/actions";

const idSchema = z.uuid();

export async function approveIterationAction(iterationId: string) {
  const session = await assertAdmin();
  assertFeatureEnabled("iterations");
  const id = idSchema.parse(iterationId);

  const iteration = await getDb().transaction(async (tx) => {
    const [pendingIteration] = await tx
      .select({
        status: projectIterations.status,
        projectId: projectIterations.projectId,
        projectSlug: projects.slug,
      })
      .from(projectIterations)
      .innerJoin(projects, eq(projectIterations.projectId, projects.id))
      .where(eq(projectIterations.id, id))
      .for("update");
    if (!pendingIteration) {
      throw new UserFacingError("Iteration not found.");
    }
    if (pendingIteration.status !== "pending") {
      throw new UserFacingError("Only pending content can be reviewed.");
    }

    const [images] = await tx
      .select({ value: count() })
      .from(iterationImages)
      .where(eq(iterationImages.iterationId, id));
    assertImageCount(images?.value ?? 0, "Iteration");

    await tx
      .update(projectIterations)
      .set({
        status: "approved",
        rejectionReason: null,
        approvedAt: new Date(),
        approvedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectIterations.id, id),
          eq(projectIterations.status, "pending"),
        ),
      );
    await tx.insert(moderationLogs).values({
      adminId: session.user.id,
      targetType: "iteration",
      targetId: id,
      action: "approve_iteration",
      metadata: { projectId: pendingIteration.projectId },
    });

    return pendingIteration;
  });

  revalidateProjectDetail(iteration.projectSlug);
  revalidateAdminContent("iterations");
  redirect("/admin/iterations?approved=1");
}

export async function rejectIterationAction(
  iterationId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertAdmin();
  assertFeatureEnabled("iterations");
  const id = idSchema.parse(iterationId);
  const parsed = rejectionSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const iteration = await getDb().transaction(async (tx) => {
      const [pendingIteration] = await tx
        .select({
          status: projectIterations.status,
          projectId: projectIterations.projectId,
          projectSlug: projects.slug,
        })
        .from(projectIterations)
        .innerJoin(projects, eq(projectIterations.projectId, projects.id))
        .where(eq(projectIterations.id, id))
        .for("update");
      if (!pendingIteration) {
        throw new UserFacingError("Iteration not found.");
      }
      if (pendingIteration.status !== "pending") {
        throw new UserFacingError("Only pending content can be reviewed.");
      }

      await tx
        .update(projectIterations)
        .set({
          status: "rejected",
          rejectionReason: parsed.data.reason,
          approvedAt: null,
          approvedBy: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projectIterations.id, id),
            eq(projectIterations.status, "pending"),
          ),
        );
      await tx.insert(moderationLogs).values({
        adminId: session.user.id,
        targetType: "iteration",
        targetId: id,
        action: "reject_iteration",
        reason: parsed.data.reason,
        metadata: { projectId: pendingIteration.projectId },
      });

      return pendingIteration;
    });

    revalidateProjectDetail(iteration.projectSlug);
    revalidateAdminContent("iterations");
    return { status: "success", message: "Iteration rejected." };
  } catch (error) {
    return safeActionError(error, "Unable to reject the iteration.");
  }
}
