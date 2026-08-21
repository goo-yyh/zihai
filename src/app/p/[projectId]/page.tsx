import { notFound, permanentRedirect } from "next/navigation";

import { getPublicProjectRouteBySlug } from "@/db/queries/public";
import { publicProjectPath } from "@/lib/public-routes";

export default async function LegacyProjectPage({
  params,
}: PageProps<"/p/[projectId]">) {
  const { projectId: legacySlug } = await params;
  const project = await getPublicProjectRouteBySlug(legacySlug);
  if (!project) notFound();
  permanentRedirect(publicProjectPath(project));
}
