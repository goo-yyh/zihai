import { describe, expect, it } from "vitest";

import { selectRandomRecommendations } from "@/lib/recommendations";

describe("selectRandomRecommendations", () => {
  it("selects the requested number without mutating the stable query pool", () => {
    const pool = ["one", "two", "three", "four"];

    const selected = selectRandomRecommendations(pool, 2, () => 0);

    expect(selected).toEqual(["two", "three"]);
    expect(pool).toEqual(["one", "two", "three", "four"]);
  });

  it("returns the whole pool when fewer recommendations are available", () => {
    expect(selectRandomRecommendations(["one", "two"], 5, () => 0.5)).toEqual([
      "one",
      "two",
    ]);
  });
});
