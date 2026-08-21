import { notFound, permanentRedirect } from "next/navigation";

import { getPublicProfileRouteByUsername } from "@/db/queries/public";
import { publicProfilePath } from "@/lib/public-routes";

export default async function LegacyProfilePage({
  params,
}: PageProps<"/u/[userId]">) {
  const { userId: legacyUsername } = await params;
  const profile = await getPublicProfileRouteByUsername(legacyUsername);
  if (!profile) notFound();
  permanentRedirect(publicProfilePath(profile));
}
