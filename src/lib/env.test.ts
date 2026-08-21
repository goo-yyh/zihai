import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseAuthEmailEnv, parseServerEnv } from "./env";

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

const validAuthEmailEnvironment = {
  RESEND_API_KEY: "re_test_key",
  AUTH_EMAIL_FROM: "zihAI <auth@aioff.dev>",
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

describe("parseAuthEmailEnv", () => {
  it("validates Resend only when authentication email is used", () => {
    expect(() => parseAuthEmailEnv({})).toThrow(
      "Missing or invalid authentication email environment: RESEND_API_KEY",
    );
    expect(() => parseAuthEmailEnv({ RESEND_API_KEY: "invalid-key" })).toThrow(
      "Missing or invalid authentication email environment: RESEND_API_KEY",
    );
  });

  it("uses the verified aioff.dev sender by default", () => {
    expect(parseAuthEmailEnv({ RESEND_API_KEY: "re_test_key" })).toEqual({
      RESEND_API_KEY: "re_test_key",
      AUTH_EMAIL_FROM: "zihAI <auth@aioff.dev>",
    });
  });

  it("preserves an explicitly configured sender", () => {
    expect(parseAuthEmailEnv(validAuthEmailEnvironment)).toEqual(
      validAuthEmailEnvironment,
    );
  });
});
