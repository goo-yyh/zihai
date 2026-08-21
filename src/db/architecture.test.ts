import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    DATABASE_URL: "postgresql://user:password@localhost:5432/zihai",
  }),
}));

import { getDb } from "./index";

const SRC_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...collectSourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.[jt]sx?$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

describe("database transaction architecture", () => {
  it("removes .transaction from the HTTP database type", () => {
    expectTypeOf<ReturnType<typeof getDb>>().not.toHaveProperty("transaction");
  });

  it("keeps interactive transactions inside src/db/index.ts only", () => {
    // The type-level guard is the primary defense; this scan also catches
    // dynamic access such as `const db = getDb(); db.transaction(...)`.
    const offenders = collectSourceFiles(SRC_ROOT).filter((path) => {
      const source = readFileSync(path, "utf8");
      return /\.\s*transaction\s*\(/.test(source);
    });
    expect(offenders.map((path) => path.replace(SRC_ROOT, ""))).toEqual([
      "/db/index.ts",
    ]);
  });
});
