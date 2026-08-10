import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CORE_DIR } from "../services/mcp-server/src/platform-kernel.js";

const policyFiles = fs
  .readdirSync(path.join(CORE_DIR, "policies"))
  .filter((f) => f.endsWith(".yaml"))
  .sort();

const ENFORCEMENTS = ["gate", "audit", "convention"];

describe("core policies conformance (id, enforcement, audit_required)", () => {
  it("every policy has a unique id, an enforcement mode and an audit flag", () => {
    expect(policyFiles.length).toBe(5);
    const ids = new Set<string>();
    for (const file of policyFiles) {
      const policy = parse(fs.readFileSync(path.join(CORE_DIR, "policies", file), "utf8")) as Record<string, unknown>;
      expect(typeof policy.id, `${file}.id`).toBe("string");
      expect(ids.has(policy.id as string), `duplicate id ${policy.id}`).toBe(false);
      ids.add(policy.id as string);
      expect(ENFORCEMENTS, `${file}.enforcement`).toContain(policy.enforcement);
      expect(typeof policy.audit_required, `${file}.audit_required`).toBe("boolean");
      expect(typeof policy.version, `${file}.version`).toBe("string");
    }
    expect(ids).toEqual(
      new Set(["policy.data_quality", "policy.versioning", "policy.approval", "policy.rbac", "policy.no_fake_knowledge"]),
    );
  });

  it("constitution principles carry ids and immutable rules exist", () => {
    const constitution = parse(
      fs.readFileSync(path.join(CORE_DIR, "constitution", "principles.yaml"), "utf8"),
    ) as { principles: { id: string; principle: string }[]; immutable_rules: string[] };
    expect(constitution.principles.length).toBeGreaterThanOrEqual(6);
    for (const principle of constitution.principles) {
      expect(typeof principle.id).toBe("string");
      expect(principle.id.length).toBeGreaterThan(0);
      expect(principle.principle.length).toBeGreaterThan(10);
    }
    expect(constitution.immutable_rules.length).toBeGreaterThanOrEqual(3);
  });
});
