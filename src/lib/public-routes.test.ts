import { describe, expect, it } from "vitest";

import { publicProfilePath, publicProjectPath } from "@/lib/public-routes";

describe("public resource paths", () => {
  it("combines the immutable project ID with the readable slug", () => {
    expect(
      publicProjectPath({
        id: "550e8400-e29b-41d4-a716-446655440000",
        slug: "dev-tools",
      }),
    ).toBe("/p/550e8400-e29b-41d4-a716-446655440000/dev-tools");
  });

  it("combines the immutable user ID with the readable username", () => {
    expect(
      publicProfilePath({ id: "account_123", username: "example_builder" }),
    ).toBe("/u/account_123/example_builder");
  });

  it("encodes every dynamic segment independently", () => {
    expect(publicProjectPath({ id: "id/1", slug: "hello world" })).toBe(
      "/p/id%2F1/hello%20world",
    );
    expect(publicProfilePath({ id: "user/1", username: "builder name" })).toBe(
      "/u/user%2F1/builder%20name",
    );
  });
});
