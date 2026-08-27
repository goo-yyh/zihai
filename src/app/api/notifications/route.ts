import type { NextRequest } from "next/server";

import { getNotificationPage } from "@/db/queries/notifications";
import { publicErrorMessage } from "@/lib/errors";
import { getSession } from "@/lib/session";
import { notificationListParamsSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!session.user.onboardingCompleted) {
    return Response.json(
      { error: "Complete onboarding before continuing." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = notificationListParamsSchema.safeParse({
    cursor: request.nextUrl.searchParams.get("cursor") || undefined,
    limit: request.nextUrl.searchParams.get("limit") || undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid notification pagination." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const page = await getNotificationPage(session.user.id, {
      cursor: parsed.data.cursor,
      pageSize: parsed.data.limit,
    });
    return Response.json(page, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      { error: publicErrorMessage(error, "Unable to load notifications.") },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
