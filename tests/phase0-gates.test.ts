import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertToolEnabled,
  bootstrapWorkspace,
  canEnableTool,
  loadWorkspaceManifest,
} from "../services/mcp-server/src/workspace.js";
import { loadKernelVersion, loadPlatformKernel, CORE_DIR } from "../services/mcp-server/src/platform-kernel.js";

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_WORKSPACES_DIR;
  delete process.env.CASIO_WORKSPACES_DATA_DIR;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-gates-"));
  dirs.push(d);
  process.env.CASIO_WORKSPACES_DIR = d;
  process.env.CASIO_WORKSPACES_DATA_DIR = path.join(d, "data");
  return d;
}

describe("phase 0 readiness gates", () => {
  it("level gate: level-4 tools answer disabled_until_evidence on a bootstrap workspace", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    for (const tool of ["execute_automation", "financial_action", "mutate_crm", "publish_external_content"]) {
      expect(canEnableTool(ws, tool).enabled).toBe(false);
      expect(() => assertToolEnabled(ws, tool)).toThrow("tool_disabled_until_evidence");
    }
  });

  it("bootstrap idempotency: same idempotency key returns the same manifest; different key errors", () => {
    const d = setup();
    const first = bootstrapWorkspace({ id: "acme", displayName: "Acme", idempotencyKey: "key-12345678" }, d);
    const second = bootstrapWorkspace({ id: "acme", displayName: "Acme", idempotencyKey: "key-12345678" }, d);
    expect(second.config.id).toBe(first.config.id);
    expect(second.config.bootstrapKey).toBe("key-12345678");
    expect(() => bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d)).toThrow("workspace_already_exists");
    expect(() => bootstrapWorkspace({ id: "acme", displayName: "Acme", idempotencyKey: "key-other-0001" }, d)).toThrow("workspace_already_exists");
  });

  it("the casio manifest keeps automation and external effects disabled at level 3/4", () => {
    const manifest = loadWorkspaceManifest("casio")!;
    expect(manifest.enabled_mcp_tool_levels).toEqual([0, 1, 2]);
    expect(manifest.disabled_capabilities).toEqual(
      expect.arrayContaining(["automation", "external_publish", "financial_action"]),
    );
    expect(manifest.audit_log_enabled).toBe(true);
    expect(manifest.data_quality_gate_enabled).toBe(true);
  });

  it("bootstrap readiness checklist (all present)", () => {
    const kernel = loadPlatformKernel();
    const version = loadKernelVersion();
    expect(version.kernel_version).toBe("0.1.0");
    expect(kernel.constitution.length).toBeGreaterThanOrEqual(4);
    // manifest schema + installer protocol defined
    expect(fs.existsSync(path.join(CORE_DIR, "bootstrap", "workspace-manifest.schema.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(CORE_DIR, "bootstrap", "installer-protocol.yaml"))).toBe(true);
    // evidence primitive defined
    expect(fs.existsSync(path.join(CORE_DIR, "primitives", "evidence.schema.yaml"))).toBe(true);
    // MCP contracts define side effects (enforced by tool-contracts test)
    // automation disabled by default + no-fake-knowledge policy active
    expect(fs.existsSync(path.join(CORE_DIR, "policies", "no-fake-knowledge.yaml"))).toBe(true);
    expect(kernel.disabled_until_evidence).toContain("execute_automation");
  });
});
