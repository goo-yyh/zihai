import "server-only";

import { Resend } from "resend";

import { buildAuthOtpEmail, type AuthEmailPurpose } from "@/lib/auth-email";
import { getAuthEmailEnv } from "@/lib/env";

let cachedResend: Resend | undefined;

function getResend() {
  cachedResend ??= new Resend(getAuthEmailEnv().RESEND_API_KEY);
  return cachedResend;
}

export async function sendAuthOtpEmail({
  email,
  otp,
  purpose,
}: {
  email: string;
  otp: string;
  purpose: AuthEmailPurpose;
}) {
  const env = getAuthEmailEnv();
  const message = buildAuthOtpEmail(otp, purpose);
  const { error } = await getResend().emails.send({
    from: env.AUTH_EMAIL_FROM,
    to: [email],
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  if (error) {
    throw new Error(`Resend authentication email failed: ${error.message}`);
  }
}
