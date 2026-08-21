export type DatabaseTarget = "preview" | "production";

type DatabaseTargetInput = {
  target: DatabaseTarget;
  expectedSiteHost: string;
  databaseEnvironment: string | undefined;
  databaseUrl: string | undefined;
  betterAuthUrl: string | undefined;
  siteUrl: string | undefined;
};

function requiredUrl(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is required.`);

  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
}

export function validateDatabaseTarget({
  target,
  expectedSiteHost,
  databaseEnvironment,
  databaseUrl,
  betterAuthUrl,
  siteUrl,
}: DatabaseTargetInput) {
  if (databaseEnvironment !== target) {
    throw new Error(
      `Refusing ${target} database command: DATABASE_ENVIRONMENT must equal ${target}.`,
    );
  }

  const database = requiredUrl(databaseUrl, "DATABASE_URL");
  if (!["postgres:", "postgresql:"].includes(database.protocol)) {
    throw new Error("DATABASE_URL must use the postgres protocol.");
  }

  const expectedHost = expectedSiteHost.toLowerCase();

  for (const [name, value] of [
    ["BETTER_AUTH_URL", betterAuthUrl],
    ["NEXT_PUBLIC_SITE_URL", siteUrl],
  ] as const) {
    if (!value) continue;
    const url = requiredUrl(value, name);
    if (url.hostname.toLowerCase() !== expectedHost) {
      throw new Error(
        `Refusing ${target} database command: ${name} targets ${url.hostname}, expected ${expectedHost}.`,
      );
    }
  }

  return {
    target,
    siteHost: expectedHost,
    databaseHost: database.hostname,
  };
}
