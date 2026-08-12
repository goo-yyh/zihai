import "server-only";

import { revalidatePath } from "next/cache";

export function revalidatePublicProject(
  slug: string,
  ownerUsername?: string | null,
) {
  revalidatePath("/");
  revalidatePath(`/p/${slug}`);
  if (ownerUsername) revalidatePath(`/u/${ownerUsername}`);
}

export function revalidateProjectDetail(slug: string) {
  revalidatePath(`/p/${slug}`);
}

export function revalidateProjectWorkspace(projectId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}/edit`);
}

export function revalidateIterationWorkspace(
  projectId: string,
  iterationId?: string,
) {
  revalidatePath(`/dashboard/projects/${projectId}/edit`);
  if (iterationId) {
    revalidatePath(
      `/dashboard/projects/${projectId}/iterations/${iterationId}/edit`,
    );
  }
}

export function revalidateAdminContent(kind: "projects" | "iterations") {
  revalidatePath("/admin");
  revalidatePath(`/admin/${kind}`);
}

export function revalidateAdminUsers() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
}

export function revalidateUserPresentation(
  ...usernames: Array<string | null | undefined>
) {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/settings/profile");
  revalidatePath("/onboarding");
  revalidatePath("/p/[slug]", "page");
  for (const username of new Set(usernames.filter(Boolean))) {
    revalidatePath(`/u/${username}`);
  }
}
