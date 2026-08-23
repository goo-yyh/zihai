import { describe, expect, it } from "vitest";

import {
  assertIdeaTransition,
  canTransitionIdea,
  IDEA_STATUSES,
} from "@/lib/idea-lifecycle";

describe("idea lifecycle", () => {
  it.each([
    ["pending", "accepted"],
    ["pending", "rejected"],
    ["accepted", "completed"],
  ] as const)("allows %s → %s", (currentStatus, nextStatus) => {
    expect(canTransitionIdea(currentStatus, nextStatus)).toBe(true);
    expect(() => assertIdeaTransition(currentStatus, nextStatus)).not.toThrow();
  });

  it.each(
    IDEA_STATUSES.flatMap((currentStatus) =>
      IDEA_STATUSES.filter(
        (nextStatus) => !canTransitionIdea(currentStatus, nextStatus),
      ).map((nextStatus) => [currentStatus, nextStatus] as const),
    ),
  )("rejects %s → %s", (currentStatus, nextStatus) => {
    expect(() => assertIdeaTransition(currentStatus, nextStatus)).toThrow();
  });
});
