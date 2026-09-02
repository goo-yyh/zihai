"use server";

import "server-only";

import { z } from "zod";

import { assertOnboardedUser } from "@/lib/session";
import {
  revalidateProjectWorkspace,
  revalidatePublicProject,
} from "@/server/cache";
import { deleteOwnedProjectQrCode } from "@/server/image-service";

const idSchema = z.uuid();

export async function deleteProjectQrCodeAction(projectId: string) {
  const session = await assertOnboardedUser();
  const result = await deleteOwnedProjectQrCode(
    idSchema.parse(projectId),
    session.user.id,
  );

  revalidateProjectWorkspace(result.projectId);
  revalidatePublicProject(
    { id: result.projectId, slug: result.slug },
    { id: session.user.id, username: session.user.username },
  );
}
