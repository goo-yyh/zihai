import { describe, expect, it } from "vitest";

import { buildAuthOtpEmail, isAllowedAuthEmail } from "@/lib/auth-email";

describe("isAllowedAuthEmail", () => {
  it.each(["builder@qq.com", " Builder@163.COM "])(
    "accepts an allowed identity email: %s",
    (email) => {
      expect(isAllowedAuthEmail(email)).toBe(true);
    },
  );

  it.each([
    "builder@mail.qq.com",
    "builder@qq.com.example.com",
    "builder@gmail.com",
    "builder@qq.com@163.com",
    "qq.com",
  ])("rejects an unsupported identity email: %s", (email) => {
    expect(isAllowedAuthEmail(email)).toBe(false);
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
