import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  hashAuthCaptchaAnswer,
  renderAuthCaptchaImage,
} from "@/server/auth-captcha";

describe("authentication captcha", () => {
  it("binds the answer to the normalized email and challenge", () => {
    const base = {
      challengeId: "37c7c19d-38ff-4029-b927-009b80a22333",
      answer: "23456",
      secret: "test-secret",
    };

    expect(hashAuthCaptchaAnswer({ ...base, email: " Builder@QQ.COM " })).toBe(
      hashAuthCaptchaAnswer({ ...base, email: "builder@qq.com" }),
    );
    expect(hashAuthCaptchaAnswer({ ...base, email: "other@qq.com" })).not.toBe(
      hashAuthCaptchaAnswer({ ...base, email: "builder@qq.com" }),
    );
  });

  it("renders a raster PNG instead of exposing text in SVG markup", () => {
    const image = renderAuthCaptchaImage("23456", () => 0);
    const png = Buffer.from(
      image.slice("data:image/png;base64,".length),
      "base64",
    );

    expect(image).toMatch(/^data:image\/png;base64,/);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.length).toBeGreaterThan(200);
  });
});
