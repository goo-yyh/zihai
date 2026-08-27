import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const logoutButtonSource = readFileSync(
  fileURLToPath(new URL("./logout-button.tsx", import.meta.url)),
  "utf8",
);

describe("LogoutButton", () => {
  it("bounds the sign-out request and always clears its pending state", () => {
    expect(logoutButtonSource).toContain("SIGN_OUT_TIMEOUT_MS = 10_000");
    expect(logoutButtonSource).toContain(
      "fetchOptions: { timeout: SIGN_OUT_TIMEOUT_MS }",
    );
    expect(logoutButtonSource).toMatch(/finally\s*{\s*setPending\(false\)/);
  });

  it("performs a hard navigation after logout to clear preserved auth UI", () => {
    expect(logoutButtonSource).toContain(
      'window.location.replace(new URL("/", window.location.origin))',
    );
    expect(logoutButtonSource).not.toContain("router.refresh()");
    expect(logoutButtonSource).not.toContain("router.replace(");
  });
});
