import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { runBootstrap } from "../services/bootstrap-engine/src/engine.js";
import { loadWorkspace } from "../src/workspace.js";

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_WORKSPACES_DIR;
  delete process.env.CASIO_WORKSPACES_DATA_DIR;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-phase1-"));
  dirs.push(d);
  process.env.CASIO_WORKSPACES_DIR = d;
  process.env.CASIO_WORKSPACES_DATA_DIR = path.join(d, "data");
  return d;
}

describe("bootstrap-lifecycle — zero to field_discovery with only Level 0", () => {
  it("runs full bootstrap 01→07 and ends field_discovery with correct bootstrap state", async () => {
    const d = setup();
    const result = await runBootstrap({ workspaceId: "acme", displayName: "Acme Co", channel: "experimental", installerId: "test:2026-08-11" });
    expect(result.workspaceId).toBe("acme");
    const ws = loadWorkspace("acme", d);
    expect(ws.manifest?.status).toBe("field_discovery");
    expect(ws.manifest?.bootstrap_run_id).toBeTruthy();
    // Check bootstrap state per spec
    expect(ws.manifest?.bootstrap?.organization_profile).toBe("needs_definition");
    expect(ws.manifest?.bootstrap?.domains).toBe("empty_structure");
    expect(ws.manifest?.bootstrap?.knowledge_map).toBe("empty_graph");
    expect(ws.manifest?.bootstrap?.playbooks).toBe("templates_only");
    expect(ws.manifest?.bootstrap?.data_registers).toBe("schema_only");
    expect(ws.manifest?.bootstrap?.workflows).toBe("needs_field_discovery");
    expect(ws.manifest?.bootstrap?.automation_specs).toBe("disabled_until_approved");
    // answers.yaml exists and has questions
    const answersRaw = fs.readFileSync(path.join(d, "acme", "answers.yaml"), "utf8");
    const answers: any = parse(answersRaw);
    expect(answers.workspace_id).toBe("acme");
    expect(answers.answers).toBeTruthy();
    // Report exists
    expect(fs.existsSync(path.join(d, "acme", "bootstrap-report.json"))).toBe(true);
  });
});
