import { describe, expect, it } from "vitest";

import {
  assertProjectSuggestionRejectionReason,
  assertProjectSuggestionTransition,
  PROJECT_SUGGESTION_STATUSES,
  type ProjectSuggestionStatus,
} from "@/lib/project-suggestion-lifecycle";

describe("project suggestion lifecycle", () => {
  const validTransitions: Array<
    [ProjectSuggestionStatus, ProjectSuggestionStatus]
  > = [
    ["pending", "accepted"],
    ["pending", "rejected"],
    ["accepted", "completed"],
  ];

  it.each(validTransitions)("allows %s -> %s", (current, next) => {
    expect(() =>
      assertProjectSuggestionTransition(current, next),
    ).not.toThrow();
  });

  it.each(
    PROJECT_SUGGESTION_STATUSES.flatMap((current) =>
      PROJECT_SUGGESTION_STATUSES.filter(
        (next) =>
          !validTransitions.some(
            ([allowedCurrent, allowedNext]) =>
              allowedCurrent === current && allowedNext === next,
          ),
      ).map((next) => [current, next] as const),
    ),
  )("rejects %s -> %s", (current, next) => {
    expect(() => assertProjectSuggestionTransition(current, next)).toThrow(
      "This suggestion can no longer be updated.",
    );
  });

  it("normalizes and validates rejection reasons", () => {
    expect(assertProjectSuggestionRejectionReason("  not planned  ")).toBe(
      "not planned",
    );
    expect(() => assertProjectSuggestionRejectionReason("no")).toThrow();
    expect(() =>
      assertProjectSuggestionRejectionReason("x".repeat(2001)),
    ).toThrow();
  });
});
