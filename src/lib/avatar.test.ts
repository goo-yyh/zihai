import { describe, expect, it } from "vitest";

import { avatarSrc, DEFAULT_AVATAR_SRC } from "@/lib/avatar";

describe("avatar source", () => {
  it.each([undefined, null, "", "   "])(
    "uses the default avatar when the source is %s",
    (source) => {
      expect(avatarSrc(source)).toBe(DEFAULT_AVATAR_SRC);
    },
  );

  it("keeps a configured avatar and trims surrounding whitespace", () => {
    expect(avatarSrc("  https://example.com/avatar.png  ")).toBe(
      "https://example.com/avatar.png",
    );
  });
});
