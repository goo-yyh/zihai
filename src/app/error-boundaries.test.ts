import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

describe("application error boundaries", () => {
  it("uses the Next.js retry callback for route errors", () => {
    const routeError = source("./error.tsx");
    expect(routeError).toContain("retry: () => void");
    expect(routeError).toContain("onClick={retry}");
    expect(routeError).not.toContain("reset: () => void");
  });

  it("provides a standalone fallback for root layout errors", () => {
    const globalError = source("./global-error.tsx");
    expect(globalError).toContain('<html lang="zh-CN">');
    expect(globalError).toContain("<body");
    expect(globalError).toContain('role="alert"');
    expect(globalError).toContain("onClick={retry}");
  });
});
