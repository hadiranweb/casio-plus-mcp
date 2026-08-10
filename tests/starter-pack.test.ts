import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CORE_DIR } from "../services/mcp-server/src/platform-kernel.js";

const starter = parse(
  fs.readFileSync(path.join(CORE_DIR, "bootstrap", "starter-pack.yaml"), "utf8"),
) as {
  version: string;
  templates: Record<string, Record<string, unknown>>;
};

describe("starter pack (no fake knowledge — vessels only)", () => {
  it("every template is an empty vessel: no title/description/content defaults", () => {
    const names = Object.keys(starter.templates);
    expect(names).toEqual(
      expect.arrayContaining(["playbook", "template", "decision", "registry", "workflow_map", "data_model", "automation_spec"]),
    );
    for (const [name, tpl] of Object.entries(starter.templates)) {
      expect(tpl, `${name} must not carry a title`).not.toHaveProperty("title");
      expect(tpl, `${name} must not carry a description`).not.toHaveProperty("description");
      const owner = tpl.owner;
      expect(owner === null || owner === undefined, `${name} owner must be null/absent`).toBe(true);
      expect((tpl.evidence_count ?? 0) as number, `${name} evidence must be 0`).toBe(0);
      expect(tpl, `${name} must not have content defaults`).not.toHaveProperty("default");
    }
  });

  it("automation spec starts disabled_until_approved", () => {
    expect(starter.templates.automation_spec.status).toBe("disabled_until_approved");
  });
});
