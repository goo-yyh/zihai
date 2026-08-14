import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";

import { getDb } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { getServerEnv } from "@/lib/env";
import { getSiteUrl } from "@/lib/site";
import { usernameSchema } from "@/lib/validations";

function createAuth() {
  const env = getServerEnv();

  return betterAuth({
    appName: "zihAI",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: Array.from(new Set([env.BETTER_AUTH_URL, getSiteUrl()])),
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
      },
    },
    plugins: [
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
