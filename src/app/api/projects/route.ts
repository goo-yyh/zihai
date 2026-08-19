import type { NextRequest } from "next/server";

import { getPublicProjects } from "@/db/queries/public";
import { publicErrorMessage } from "@/lib/errors";
import { projectDiscoveryParamsSchema } from "@/lib/project-discovery";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsed = projectDiscoveryParamsSchema.safeParse({
    sort: request.nextUrl.searchParams.get("sort") || undefined,
    query: request.nextUrl.searchParams.get("q") || undefined,
    page: request.nextUrl.searchParams.get("page") || undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid project filters." },
      { status: 400 },
    );
  }

  try {
    const page = await getPublicProjects(parsed.data);
    return Response.json(page, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      { error: publicErrorMessage(error, "Unable to load projects.") },
      { status: 500 },
    );
  }
}
