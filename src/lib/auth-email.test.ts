import { describe, expect, it } from "vitest";

import {
  buildAuthOtpEmail,
  identityEmailSchema,
  isValidIdentityEmail,
} from "@/lib/auth-email";

describe("identity email validation", () => {
  it.each([
    "builder@qq.com",
    " Builder@163.COM ",
    "builder@gmail.com",
    "builder@mail.example.com",
    "builder@company.ai",
  ])("accepts a valid identity email from any domain: %s", (email) => {
    expect(isValidIdentityEmail(email)).toBe(true);
  });

  it.each([
    "builder@qq.com@163.com",
    "qq.com",
    "builder@",
    "@example.com",
    "builder example.com",
  ])("rejects an invalid identity email: %s", (email) => {
    expect(isValidIdentityEmail(email)).toBe(false);
  });

  it("normalizes identity emails and enforces the maximum length", () => {
    expect(identityEmailSchema.parse(" Builder@Example.COM ")).toBe(
      "builder@example.com",
    );
    expect(
      identityEmailSchema.safeParse(`${"a".repeat(243)}@example.com`).success,
    ).toBe(false);
  });
});

describe("buildAuthOtpEmail", () => {
  it("builds a bilingual sign-in message without exposing raw HTML", () => {
    const message = buildAuthOtpEmail("12<345", "sign-in");

    expect(message.subject).toContain("sign-in code");
    expect(message.text).toContain("12<345");
    expect(message.html).toContain("12&lt;345");
    expect(message.html).not.toContain("12<345");
  });
});
