import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseServerEnv } from "./env";

const validEnvironment = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/zihai",
  BETTER_AUTH_SECRET: "runtime-secret-runtime-secret-runtime-secret",
  BETTER_AUTH_URL: "https://preview.example.com",
  GITHUB_CLIENT_ID: "github-client",
  GITHUB_CLIENT_SECRET: "github-secret",
  GOOGLE_CLIENT_ID: "google-client",
  GOOGLE_CLIENT_SECRET: "google-secret",
  BLOB_READ_WRITE_TOKEN: "blob-token",
};

describe("parseServerEnv", () => {
  it("keeps runtime environment validation strict", () => {
    expect(() => parseServerEnv({})).toThrow(
      "Missing or invalid server environment: DATABASE_URL",
    );
  });

  it("rejects invalid values", () => {
    expect(() =>
      parseServerEnv({
        ...validEnvironment,
        BETTER_AUTH_URL: "not-a-url",
      }),
    ).toThrow("Missing or invalid server environment: BETTER_AUTH_URL");
  });

  it("preserves valid runtime values", () => {
    expect(parseServerEnv(validEnvironment)).toEqual(validEnvironment);
  });
});
