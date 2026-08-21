import { describe, expect, it } from "vitest";

import {
  assertCanCreateProject,
  canCreateProject,
  MAX_PROJECTS_PER_USER,
  PROJECT_LIMIT_MESSAGE,
} from "@/lib/project-limits";

describe("per-user project limit", () => {
  it("allows creation below the limit", () => {
    expect(canCreateProject(MAX_PROJECTS_PER_USER - 1)).toBe(true);
    expect(() =>
      assertCanCreateProject(MAX_PROJECTS_PER_USER - 1),
    ).not.toThrow();
  });

  it.each([MAX_PROJECTS_PER_USER, MAX_PROJECTS_PER_USER + 1])(
    "rejects creation at or above the limit: %i",
    (projectCount) => {
      expect(canCreateProject(projectCount)).toBe(false);
      expect(() => assertCanCreateProject(projectCount)).toThrow(
        PROJECT_LIMIT_MESSAGE,
      );
    },
  );
});
