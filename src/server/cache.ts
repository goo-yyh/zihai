import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

import {
  PUBLIC_PROJECT_DETAILS_TAG,
  PUBLIC_PROJECT_LIST_TAG,
  PUBLIC_SITEMAP_TAG,
  publicProfileTag,
  publicProjectTag,
} from "@/lib/cache-tags";

function expireTag(tag: string) {
  revalidateTag(tag, { expire: 0 });
}

export function revalidatePublicProject(
  slug: string,
  ownerUsername?: string | null,
) {
  expireTag(PUBLIC_PROJECT_LIST_TAG);
  expireTag(publicProjectTag(slug));
  expireTag(PUBLIC_SITEMAP_TAG);
  if (ownerUsername) expireTag(publicProfileTag(ownerUsername));
  revalidatePath("/");
  revalidatePath(`/p/${slug}`);
  if (ownerUsername) revalidatePath(`/u/${ownerUsername}`);
}

export function revalidateProjectDetail(slug: string) {
  expireTag(publicProjectTag(slug));
  revalidatePath(`/p/${slug}`);
}

export function revalidateProjectLike(
  slug: string,
  ownerUsername?: string | null,
) {
  expireTag(PUBLIC_PROJECT_LIST_TAG);
  expireTag(publicProjectTag(slug));
  if (ownerUsername) expireTag(publicProfileTag(ownerUsername));
  revalidatePath("/");
  revalidatePath(`/p/${slug}`);
  if (ownerUsername) revalidatePath(`/u/${ownerUsername}`);
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
  expireTag(PUBLIC_PROJECT_LIST_TAG);
  expireTag(PUBLIC_PROJECT_DETAILS_TAG);
  expireTag(PUBLIC_SITEMAP_TAG);
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/settings/profile");
  revalidatePath("/onboarding");
  revalidatePath("/admin/users");
  revalidatePath("/admin/users/[id]", "page");
  revalidatePath("/p/[slug]", "page");
  for (const username of new Set(
    usernames.filter((value): value is string => Boolean(value)),
  )) {
    expireTag(publicProfileTag(username));
    revalidatePath(`/u/${username}`);
  }
}
