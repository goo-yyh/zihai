import { describe, expect, it } from "vitest";

import { safeReturnPath } from "@/lib/navigation";

describe("safeReturnPath", () => {
  it("accepts local absolute paths", () => {
    expect(safeReturnPath("/dashboard/projects?tab=pending")).toBe("/dashboard/projects?tab=pending");
  });

  it("blocks open redirects", () => {
    expect(safeReturnPath("https://evil.example")).toBe("/");
    expect(safeReturnPath("//evil.example/path")).toBe("/");
    expect(safeReturnPath(undefined)).toBe("/");
  });
});
