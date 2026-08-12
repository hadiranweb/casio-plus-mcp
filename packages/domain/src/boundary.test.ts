import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const forbiddenImport =
  /from\s+["'](?:next|react|pg|postgres|@prisma\/client|openclaw|@openclaw\/[^"']+|@[^"']*\/openclaw[^"']*)["']/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : entry.name.endsWith(".ts")
        ? [path]
        : [];
  });
}

describe("domain dependency direction", () => {
  it("does not import web, persistence, OpenClaw, or provider runtime packages", () => {
    for (const file of sourceFiles("packages/domain/src")) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(forbiddenImport);
    }
  });
});
