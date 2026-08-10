import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

describe("schema-sync — codegen from YAML is in sync (D3)", () => {
  it("generated types/schemas match re-generation in memory", async () => {
    const { execSync } = await import("node:child_process");
    // Run gen-schemas to ensure files are up to date, then compare with in-memory generation
    const generatedDir = path.resolve("services/mcp-server/src/generated");
    const typesPath = path.join(generatedDir, "types.ts");
    const schemasPath = path.join(generatedDir, "schemas.ts");
    expect(fs.existsSync(typesPath)).toBe(true);
    expect(fs.existsSync(schemasPath)).toBe(true);

    const beforeTypes = fs.readFileSync(typesPath, "utf8");
    const beforeSchemas = fs.readFileSync(schemasPath, "utf8");

    // Re-run generator in memory via script (should be idempotent)
    execSync("npx tsx scripts/gen-schemas.ts", { stdio: "pipe" });

    const afterTypes = fs.readFileSync(typesPath, "utf8");
    const afterSchemas = fs.readFileSync(schemasPath, "utf8");

    expect(afterTypes).toBe(beforeTypes);
    expect(afterSchemas).toBe(beforeSchemas);
  });

  it("all 11 primitive schemas exist and have required fields", () => {
    const dir = path.resolve("core/primitives");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".schema.yaml"));
    expect(files.length).toBe(11);
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const parsed: any = parse(raw);
      expect(parsed.id, `missing id in ${file}`).toMatch(/^primitive\./);
      expect(parsed.version, `missing version in ${file}`).toBe("0.1.0");
      expect(Array.isArray(parsed.fields), `fields not array in ${file}`).toBe(true);
      expect(parsed.fields.length).toBeGreaterThan(0);
      expect(Array.isArray(parsed.lifecycle), `lifecycle missing in ${file}`).toBe(true);
    }
  });

  it("evidence primitive has migration_legacy and required fields", () => {
    const raw = fs.readFileSync("core/primitives/evidence.schema.yaml", "utf8");
    const parsed: any = parse(raw);
    expect(parsed.id).toBe("primitive.evidence");
    const sourceField = parsed.fields.find((f: any) => f.name === "source");
    expect(sourceField.allowed_values).toContain("migration_legacy");
    expect(parsed.fields.find((f: any) => f.name === "evidence_id").required).toBe(true);
    expect(parsed.fields.find((f: any) => f.name === "confidence").range).toEqual([0, 1]);
    expect(parsed.lifecycle).toContain("captured");
  });
});
