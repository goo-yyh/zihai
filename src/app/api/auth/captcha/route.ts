import { authCaptchaRequestSchema } from "@/lib/auth-captcha";
import { createAuthCaptcha } from "@/server/auth-captcha";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = authCaptchaRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid email address." }, { status: 400 });
  }

  try {
    const challenge = await createAuthCaptcha(parsed.data.email);
    return Response.json(challenge, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to create authentication captcha", error);
    return Response.json(
      { error: "Unable to create image verification code." },
      { status: 500 },
    );
  }
}
