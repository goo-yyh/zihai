import { getUnreadNotificationCount } from "@/db/queries/notifications";
import { publicErrorMessage } from "@/lib/errors";
import { getSession } from "@/lib/session";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders },
    );
  }
  if (!session.user.onboardingCompleted) {
    return Response.json(
      { error: "Complete onboarding before continuing." },
      { status: 403, headers: noStoreHeaders },
    );
  }

  try {
    const count = await getUnreadNotificationCount(session.user.id);
    return Response.json({ count }, { headers: noStoreHeaders });
  } catch (error) {
    return Response.json(
      {
        error: publicErrorMessage(
          error,
          "Unable to load the unread notification count.",
        ),
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
