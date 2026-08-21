import { z } from "zod";

export type AuthEmailPurpose =
  "sign-in" | "email-verification" | "forget-password" | "change-email";

export const identityEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());

export function isValidIdentityEmail(email: string) {
  return identityEmailSchema.safeParse(email).success;
}

const purposeContent: Record<
  AuthEmailPurpose,
  { subject: string; heading: string; description: string }
> = {
  "sign-in": {
    subject: "Your zihAI sign-in code / zihAI 登录验证码",
    heading: "Sign in to zihAI / 登录 zihAI",
    description: "Enter this code to continue. / 输入此验证码以继续。",
  },
  "email-verification": {
    subject: "Verify your zihAI email / 验证 zihAI 邮箱",
    heading: "Verify your email / 验证你的邮箱",
    description:
      "Enter this code to verify your email. / 输入此验证码完成邮箱验证。",
  },
  "forget-password": {
    subject: "Reset your zihAI password / 重置 zihAI 密码",
    heading: "Reset your password / 重置密码",
    description:
      "Enter this code to reset your password. / 输入此验证码以重置密码。",
  },
  "change-email": {
    subject: "Confirm your new zihAI email / 确认新的 zihAI 邮箱",
    heading: "Confirm your new email / 确认新邮箱",
    description:
      "Enter this code to confirm the change. / 输入此验证码以确认修改。",
  },
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] || character,
  );
}

export function buildAuthOtpEmail(otp: string, purpose: AuthEmailPurpose) {
  const content = purposeContent[purpose];
  const safeOtp = escapeHtml(otp);

  return {
    subject: content.subject,
    text: `${content.heading}\n\n${content.description}\n\n${otp}\n\nThis code expires in 5 minutes. Do not share it.\n验证码 5 分钟后失效，请勿向任何人透露。`,
    html: `
      <div style="background:#f5f2ea;padding:32px 16px;font-family:Arial,sans-serif;color:#17211b">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dfe5df;border-radius:20px;padding:32px">
          <p style="margin:0 0 20px;font-size:13px;font-weight:700;letter-spacing:0.16em;color:#34785a">zihAI</p>
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3">${content.heading}</h1>
          <p style="margin:0 0 24px;color:#5d6a62;line-height:1.7">${content.description}</p>
          <div style="border-radius:14px;background:#eef7f1;padding:20px;text-align:center;font-family:monospace;font-size:32px;font-weight:800;letter-spacing:0.28em;color:#1d5d43">${safeOtp}</div>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#738078">This code expires in 5 minutes. Do not share it.<br />验证码 5 分钟后失效，请勿向任何人透露。</p>
        </div>
      </div>
    `,
  };
}
