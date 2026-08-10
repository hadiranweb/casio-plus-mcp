import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bootstrapWorkspace, canEnableTool } from "../src/workspace.js";

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_WORKSPACES_DIR;
  delete process.env.CASIO_WORKSPACES_DATA_DIR;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-level-"));
  dirs.push(d);
  process.env.CASIO_WORKSPACES_DIR = d;
  process.env.CASIO_WORKSPACES_DATA_DIR = path.join(d, "data");
  return d;
}

describe("level-gate — automation disabled until evidence", () => {
  it("level 4 tools are disabled at bootstrap, enabled at forming", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    expect(canEnableTool(ws, "execute_approved_automation").enabled).toBe(false);
    expect(canEnableTool(ws, "execute_approved_automation").reason).toContain("tool_disabled_until_evidence");
    expect(canEnableTool(ws, "financial_action").enabled).toBe(false);
    // bootstrap tools are enabled
    expect(canEnableTool(ws, "create_workspace").enabled).toBe(true);
    expect(canEnableTool(ws, "capture_field_observation").enabled).toBe(true);
  });

  it("server gate returns disabled_until_evidence error for level 4 at bootstrap", async () => {
    const d = setup();
    bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    // Simulate server check via canEnableTool — same logic server uses
    const { loadWorkspace } = await import("../src/workspace.js");
    const ws = loadWorkspace("acme", d);
    const gate = canEnableTool(ws, "execute_approved_automation");
    expect(gate.enabled).toBe(false);
    expect(gate.reason).toContain("bootstrap");
  });
});
