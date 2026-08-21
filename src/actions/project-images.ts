"use server";

import "server-only";

import { z } from "zod";

import { assertOnboardedUser } from "@/lib/session";
import {
  revalidateProjectWorkspace,
  revalidatePublicProject,
} from "@/server/cache";
import {
  deleteOwnedProjectImage,
  reorderOwnedProjectImages,
} from "@/server/image-service";

const idSchema = z.uuid();
const imageOrderSchema = z.array(idSchema).min(1).max(3);

export async function deleteProjectImageAction(imageId: string) {
  const session = await assertOnboardedUser();
  const result = await deleteOwnedProjectImage(
    idSchema.parse(imageId),
    session.user.id,
  );

  revalidateProjectWorkspace(result.projectId);
  revalidatePublicProject(
    { id: result.projectId, slug: result.slug },
    { id: session.user.id, username: session.user.username },
  );
}

export async function reorderProjectImagesAction(
  projectId: string,
  orderedImageIds: string[],
) {
  const session = await assertOnboardedUser();
  const result = await reorderOwnedProjectImages(
    idSchema.parse(projectId),
    imageOrderSchema.parse(orderedImageIds),
    session.user.id,
  );

  revalidateProjectWorkspace(result.projectId);
  revalidatePublicProject(
    { id: result.projectId, slug: result.slug },
    { id: session.user.id, username: session.user.username },
  );
}
