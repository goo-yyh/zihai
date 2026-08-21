import { z } from "zod";

import { identityEmailSchema } from "@/lib/auth-email";

export const AUTH_CAPTCHA_ID_HEADER = "x-zihai-captcha-id";
export const AUTH_CAPTCHA_ANSWER_HEADER = "x-zihai-captcha-answer";

export const authCaptchaRequestSchema = z.object({
  email: identityEmailSchema,
});

export const authCaptchaVerificationSchema = z.object({
  challengeId: z.string().uuid(),
  answer: z
    .string()
    .trim()
    .regex(/^[2-9]{5}$/),
  email: identityEmailSchema,
});

export const authCaptchaChallengeSchema = z.object({
  id: z.string().uuid(),
  image: z.string().startsWith("data:image/png;base64,"),
});

export type AuthCaptchaChallenge = z.infer<typeof authCaptchaChallengeSchema>;
