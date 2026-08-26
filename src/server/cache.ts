import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

import {
  PUBLIC_PROJECT_DETAILS_TAG,
  PUBLIC_PROJECT_LIST_TAG,
  PUBLIC_SITEMAP_TAG,
  publicProfileTag,
  publicProjectTag,
} from "@/lib/cache-tags";
import { publicProfilePath, publicProjectPath } from "@/lib/public-routes";

type PublicProjectReference = {
  id: string;
  slug: string;
};

type PublicProfileReference = {
  id: string;
  username?: string | null;
};

function expireTag(tag: string) {
  revalidateTag(tag, { expire: 0 });
}

export function revalidatePublicProject(
  project: PublicProjectReference,
  owner?: PublicProfileReference,
) {
  expireTag(PUBLIC_PROJECT_LIST_TAG);
  expireTag(publicProjectTag(project.id));
  expireTag(PUBLIC_SITEMAP_TAG);
  if (owner) expireTag(publicProfileTag(owner.id));
  revalidatePath("/");
  revalidatePath(publicProjectPath(project));
  revalidatePath(`/p/${project.slug}`);
  if (owner?.username) {
    revalidatePath(
      publicProfilePath({ id: owner.id, username: owner.username }),
    );
    revalidatePath(`/u/${owner.username}`);
  }
}

export function revalidateProjectLike(
  project: PublicProjectReference,
  owner?: PublicProfileReference,
) {
  expireTag(PUBLIC_PROJECT_LIST_TAG);
  expireTag(publicProjectTag(project.id));
  if (owner) expireTag(publicProfileTag(owner.id));
  revalidatePath("/");
  revalidatePath(publicProjectPath(project));
  revalidatePath(`/p/${project.slug}`);
  if (owner?.username) {
    revalidatePath(
      publicProfilePath({ id: owner.id, username: owner.username }),
    );
    revalidatePath(`/u/${owner.username}`);
  }
}

export function revalidateProjectWorkspace(projectId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}/edit`);
}

export function revalidateAdminProjects() {
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
}

export function revalidateAdminUsers() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
}

export function revalidateIdeaContent(ideaId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ideas");
  revalidatePath("/admin");
  revalidatePath("/admin/ideas");
  revalidatePath("/admin/audit");
  if (ideaId) revalidatePath(`/admin/ideas/${ideaId}`);
}

export function revalidateUserPresentation(
  userId: string,
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
  revalidatePath("/p/[projectId]/[slug]", "page");
  expireTag(publicProfileTag(userId));
  for (const username of new Set(
    usernames.filter((value): value is string => Boolean(value)),
  )) {
    revalidatePath(publicProfilePath({ id: userId, username }));
    revalidatePath(`/u/${username}`);
  }
}
