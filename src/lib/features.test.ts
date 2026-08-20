import { describe, expect, it } from "vitest";

import { assertFeatureEnabled, isFeatureEnabled } from "@/lib/features";

describe("feature availability", () => {
  it("keeps iterations hidden until the feature is deliberately enabled", () => {
    expect(isFeatureEnabled("iterations")).toBe(false);
    expect(() => assertFeatureEnabled("iterations")).toThrow(
      "This feature is temporarily unavailable.",
    );
  });
});
