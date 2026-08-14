import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
});

const productionBuildDefaults = {
  DATABASE_URL: "postgresql://build:build@build.invalid:5432/build",
  BETTER_AUTH_SECRET: "build-only-secret-build-only-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  GITHUB_CLIENT_ID: "build-github-client",
  GITHUB_CLIENT_SECRET: "build-github-secret",
  GOOGLE_CLIENT_ID: "build-google-client",
  GOOGLE_CLIENT_SECRET: "build-google-secret",
  BLOB_READ_WRITE_TOKEN: "build-blob-token",
} satisfies z.input<typeof serverEnvSchema>;

export function parseServerEnv(
  environment: Readonly<Record<string, string | undefined>>,
) {
  const candidate =
    environment.NEXT_PHASE === "phase-production-build"
      ? {
          ...productionBuildDefaults,
          ...Object.fromEntries(
            Object.entries(environment).filter(([, value]) => value != null),
          ),
        }
      : environment;
  const parsed = serverEnvSchema.safeParse(candidate);

  if (!parsed.success) {
    const keys = parsed.error.issues.map((issue) => issue.path.join("."));
    throw new Error(
      `Missing or invalid server environment: ${keys.join(", ")}`,
    );
  }

  return parsed.data;
}

let cachedEnv: z.infer<typeof serverEnvSchema> | undefined;

export function getServerEnv() {
  if (cachedEnv) return cachedEnv;

  // Route modules are evaluated while `next build` collects their config.
  // Non-secret placeholders keep that compile-only phase independent from
  // deployment credentials; runtime processes still require real values.
  cachedEnv = parseServerEnv(process.env);
  return cachedEnv;
}
