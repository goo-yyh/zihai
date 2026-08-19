"use server";

import "server-only";

import { count, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  iterationImages,
  projectImages,
  projectIterations,
  projects,
  user,
} from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { UserFacingError } from "@/lib/errors";
import { assertOnboardedUser } from "@/lib/session";
import { deleteBlobsBestEffort } from "@/server/blob";
import { revalidateUserPresentation } from "@/server/cache";

export async function logoutAction() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}

export async function deleteAccountAction(formData: FormData) {
  const session = await assertOnboardedUser();
  z.literal("DELETE").parse(formData.get("confirmation"));

  const [ownedProjects, ownedIterations, avatar] = await Promise.all([
    getDb()
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, session.user.id)),
    getDb()
      .select({ id: projectIterations.id })
      .from(projectIterations)
      .where(eq(projectIterations.ownerId, session.user.id)),
    getDb()
      .select({ pathname: user.avatarPathname })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1),
  ]);

  const projectIds = ownedProjects.map(({ id }) => id);
  const iterationIds = ownedIterations.map(({ id }) => id);
  const [projectPaths, iterationPaths] = await Promise.all([
    projectIds.length
      ? getDb()
          .select({ pathname: projectImages.blobPathname })
          .from(projectImages)
          .where(inArray(projectImages.projectId, projectIds))
      : Promise.resolve([]),
    iterationIds.length
      ? getDb()
          .select({ pathname: iterationImages.blobPathname })
          .from(iterationImages)
          .where(inArray(iterationImages.iterationId, iterationIds))
      : Promise.resolve([]),
  ]);
  const pathnames = [
    ...(avatar[0]?.pathname ? [avatar[0].pathname] : []),
    ...projectPaths.map(({ pathname }) => pathname),
    ...iterationPaths.map(({ pathname }) => pathname),
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
  await getDb().transaction(async (tx) => {
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
  revalidateUserPresentation(session.user.username);
  redirect("/?account=deleted");
}
