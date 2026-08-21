import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { APIError, betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP, username } from "better-auth/plugins";
import { after } from "next/server";

import { getDb } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import {
  AUTH_CAPTCHA_ANSWER_HEADER,
  AUTH_CAPTCHA_ID_HEADER,
} from "@/lib/auth-captcha";
import { isAllowedAuthEmail } from "@/lib/auth-email";
import { githubFallbackEmail } from "@/lib/contact-email";
import { getServerEnv } from "@/lib/env";
import { getSiteUrl } from "@/lib/site";
import { usernameSchema } from "@/lib/validations";
import { verifyAndConsumeAuthCaptcha } from "@/server/auth-captcha";
import { sendAuthOtpEmail } from "@/server/auth-email";

function createAuth() {
  const env = getServerEnv();

  return betterAuth({
    appName: "zihAI",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: Array.from(new Set([env.BETTER_AUTH_URL, getSiteUrl()])),
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        mapProfileToUser: (profile) => ({
          email: profile.email?.trim() || githubFallbackEmail(profile.id),
        }),
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    user: {
      additionalFields: {
        onboardingCompleted: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
        avatarPathname: {
          type: "string",
          required: false,
          input: false,
        },
        contactEmail: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    plugins: [
      {
        id: "auth-captcha-guard",
        hooks: {
          before: [
            {
              matcher: (context) =>
                context.path === "/email-otp/send-verification-otp",
              handler: createAuthMiddleware(async (context) => {
                const validCaptcha = await verifyAndConsumeAuthCaptcha({
                  challengeId:
                    context.headers?.get(AUTH_CAPTCHA_ID_HEADER) || "",
                  answer:
                    context.headers?.get(AUTH_CAPTCHA_ANSWER_HEADER) || "",
                  email:
                    typeof context.body.email === "string"
                      ? context.body.email
                      : "",
                });

                if (!validCaptcha) {
                  throw new APIError("BAD_REQUEST", {
                    code: "INVALID_CAPTCHA",
                    message: "Image verification code is invalid or expired.",
                  });
                }
              }),
            },
          ],
        },
      },
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          if (!isAllowedAuthEmail(email)) {
            throw new APIError("BAD_REQUEST", {
              code: "UNSUPPORTED_EMAIL_DOMAIN",
              message: "Only qq.com and 163.com email addresses are supported.",
            });
          }

          after(async () => {
            try {
              await sendAuthOtpEmail({ email, otp, purpose: type });
            } catch (error) {
              console.error("Unable to send authentication email", error);
            }
          });
        },
        disableSignUp: false,
        expiresIn: 5 * 60,
        allowedAttempts: 3,
        storeOTP: "hashed",
        rateLimit: { window: 60, max: 3 },
      }),
      username({
        minUsernameLength: 3,
        maxUsernameLength: 24,
        usernameNormalization: (value) => value.toLowerCase(),
        usernameValidator: (value) => usernameSchema.safeParse(value).success,
        displayUsernameValidator: (value) =>
          usernameSchema.safeParse(value).success,
      }),
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
let cachedAuth: Auth | undefined;

export function getAuth() {
  cachedAuth ??= createAuth();
  return cachedAuth;
}

export type AuthSession = Auth["$Infer"]["Session"];
