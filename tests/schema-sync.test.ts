import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateAll, GENERATED_DIR } from "../scripts/gen-schemas.js";

describe("schema codegen sync (D3: YAML is the norm, generated files never drift)", () => {
  it("committed generated files match a fresh in-memory generation", () => {
    const { typesSource, schemasSource } = generateAll();
    expect(fs.readFileSync(path.join(GENERATED_DIR, "types.ts"), "utf8")).toBe(typesSource);
    expect(fs.readFileSync(path.join(GENERATED_DIR, "schemas.ts"), "utf8")).toBe(schemasSource);
  });

  it("every primitive schema has id/version/fields/lifecycle and covers the spec set", () => {
    const { schemas } = generateAll();
    expect(schemas.length).toBe(12);
    const ids = schemas.map((s) => s.id);
    for (const expected of [
      "primitive.playbook",
      "primitive.template",
      "primitive.decision",
      "primitive.registry",
      "primitive.workflow",
      "primitive.data_model",
      "primitive.automation_spec",
      "primitive.feedback",
      "primitive.version_proposal",
      "primitive.evidence",
      "primitive.asset_status",
      "primitive.user",
    ]) {
      expect(ids).toContain(expected);
    }
    for (const schema of schemas) {
      expect(schema.id).toMatch(/^primitive\./);
      expect(typeof schema.version).toBe("string");
      expect(schema.fields.length).toBeGreaterThan(0);
      expect(Array.isArray(schema.lifecycle)).toBe(true);
    }
  });

  it("evidence covers every required field of the spec", () => {
    const { schemas } = generateAll();
    const evidence = schemas.find((s) => s.id === "primitive.evidence")!;
    const names = evidence.fields.map((f) => f.name);
    for (const required of [
      "evidence_id",
      "source",
      "observer",
      "observed_at",
      "raw_payload",
      "related_domain",
      "confidence",
      "provenance",
      "privacy_classification",
      "review_status",
      "created_at",
    ]) {
      expect(names).toContain(required);
    }
    const source = evidence.fields.find((f) => f.name === "source")!;
    expect(source.allowed_values).toContain("migration_legacy");
    expect(evidence.lifecycle).toEqual(["captured", "triaged", "accepted", "rejected", "converted_to_proposal"]);
  });
});
