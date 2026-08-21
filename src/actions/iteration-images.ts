"use server";

import "server-only";

import { z } from "zod";

import { assertFeatureEnabled } from "@/lib/features";
import { assertOnboardedUser } from "@/lib/session";
import {
  revalidateIterationWorkspace,
  revalidateProjectDetail,
} from "@/server/cache";
import {
  deleteOwnedIterationImage,
  reorderOwnedIterationImages,
} from "@/server/image-service";

const idSchema = z.uuid();
const imageOrderSchema = z.array(idSchema).min(1).max(3);

export async function deleteIterationImageAction(imageId: string) {
  const session = await assertOnboardedUser();
  assertFeatureEnabled("iterations");
  const result = await deleteOwnedIterationImage(
    idSchema.parse(imageId),
    session.user.id,
  );

  revalidateIterationWorkspace(result.projectId, result.iterationId);
  revalidateProjectDetail({
    id: result.projectId,
    slug: result.projectSlug,
  });
}

export async function reorderIterationImagesAction(
  iterationId: string,
  orderedImageIds: string[],
) {
  const session = await assertOnboardedUser();
  assertFeatureEnabled("iterations");
  const result = await reorderOwnedIterationImages(
    idSchema.parse(iterationId),
    imageOrderSchema.parse(orderedImageIds),
    session.user.id,
  );

  revalidateIterationWorkspace(result.projectId, result.iterationId);
  revalidateProjectDetail({
    id: result.projectId,
    slug: result.projectSlug,
  });
}
