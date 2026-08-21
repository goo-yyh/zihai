import { describe, expect, it } from "vitest";

import { validateDatabaseTarget } from "@/lib/database-target";

describe("validateDatabaseTarget", () => {
  it("accepts a database config bound to the expected environment host", () => {
    expect(
      validateDatabaseTarget({
        target: "preview",
        expectedSiteHost: "staging.zihai.dev",
        databaseEnvironment: "preview",
        databaseUrl: "postgresql://user:secret@preview-db.example.com/zihai",
        betterAuthUrl: "https://staging.zihai.dev",
        siteUrl: "https://staging.zihai.dev",
      }),
    ).toEqual({
      target: "preview",
      siteHost: "staging.zihai.dev",
      databaseHost: "preview-db.example.com",
    });
  });

  it("rejects a local fallback for a Preview command", () => {
    expect(() =>
      validateDatabaseTarget({
        target: "preview",
        expectedSiteHost: "staging.zihai.dev",
        databaseEnvironment: "preview",
        databaseUrl: "postgresql://user:secret@localhost/zihai",
        betterAuthUrl: "http://localhost:3000",
        siteUrl: "http://localhost:3000",
      }),
    ).toThrow(
      "Refusing preview database command: BETTER_AUTH_URL targets localhost, expected staging.zihai.dev.",
    );
  });

  it("rejects non-Postgres database URLs", () => {
    expect(() =>
      validateDatabaseTarget({
        target: "production",
        expectedSiteHost: "www.zihai.dev",
        databaseEnvironment: "production",
        databaseUrl: "https://database.example.com",
        betterAuthUrl: "https://www.zihai.dev",
        siteUrl: "https://www.zihai.dev",
      }),
    ).toThrow("DATABASE_URL must use the postgres protocol.");
  });

  it("rejects an environment file without the matching target marker", () => {
    expect(() =>
      validateDatabaseTarget({
        target: "preview",
        expectedSiteHost: "staging.zihai.dev",
        databaseEnvironment: "development",
        databaseUrl: "postgresql://user:secret@localhost/zihai",
        betterAuthUrl: undefined,
        siteUrl: undefined,
      }),
    ).toThrow(
      "Refusing preview database command: DATABASE_ENVIRONMENT must equal preview.",
    );
  });
});
