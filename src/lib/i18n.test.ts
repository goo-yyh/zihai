import { describe, expect, it } from "vitest";

import { isLocale, localeFromAcceptLanguage, translate } from "@/lib/i18n";

describe("i18n", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("zh-CN")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });

  it("uses Chinese when it appears in Accept-Language", () => {
    expect(localeFromAcceptLanguage("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh-CN");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage(null)).toBe("zh-CN");
  });

  it("translates messages and interpolates values", () => {
    expect(
      translate("zh-CN", "Welcome back, @{username}", { username: "ai" }),
    ).toBe("欢迎回来，@ai");
    expect(
      translate("en", "Welcome back, @{username}", { username: "ai" }),
    ).toBe("Welcome back, @ai");
    expect(translate("zh-CN", "Enlarge image")).toBe("放大图片");
    expect(
      translate("zh-CN", "Notifications, {count} unread", { count: 3 }),
    ).toBe("通知，3 条未读");
    expect(translate("en", "Notifications, {count} unread", { count: 3 })).toBe(
      "Notifications, 3 unread",
    );
  });

  it("keeps unknown provider messages safe and readable", () => {
    expect(translate("zh-CN", "Provider unavailable.")).toBe(
      "Provider unavailable.",
    );
  });
});
