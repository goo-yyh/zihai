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

export function parseServerEnv(
  environment: Readonly<Record<string, string | undefined>>,
) {
  const parsed = serverEnvSchema.safeParse(environment);

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

  cachedEnv = parseServerEnv(process.env);
  return cachedEnv;
}
