import type { NextRequest } from "next/server";

import { getPublicProjectSuggestions } from "@/db/queries/project-suggestions";
import { publicErrorMessage } from "@/lib/errors";
import { publicProjectSuggestionParamsSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/projects/[projectId]/suggestions">,
) {
  const { projectId } = await params;
  const parsed = publicProjectSuggestionParamsSchema.safeParse({
    projectId,
    status: request.nextUrl.searchParams.get("status") || undefined,
    cursor: request.nextUrl.searchParams.get("cursor") || undefined,
    limit: request.nextUrl.searchParams.get("limit") || undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid suggestion filters." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const page = await getPublicProjectSuggestions(
      parsed.data.projectId,
      {
        status: parsed.data.status === "all" ? undefined : parsed.data.status,
      },
      { cursor: parsed.data.cursor, pageSize: parsed.data.limit },
    );
    if (!page) {
      return Response.json(
        { error: "Project not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(page, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      { error: publicErrorMessage(error, "Unable to load suggestions.") },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
