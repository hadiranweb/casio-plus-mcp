import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CORE_DIR,
  loadEcosystemSpec,
  loadKernelTools,
  loadPlatformKernel,
  toolLevelFor,
} from "../services/mcp-server/src/platform-kernel.js";

describe("platform kernel (non-organizational core)", () => {
  it("loads and validates the shipped kernel", () => {
    const kernel = loadPlatformKernel();
    expect(kernel.version).toBe(1);
    expect(kernel.constitution.length).toBeGreaterThanOrEqual(4);
    expect(kernel.primitives).toContain("playbook");
    expect(kernel.primitives).toContain("automation_spec");
    expect(kernel.policies).toContain("data_quality_gate");
    expect(kernel.mcp_capabilities).toContain("bootstrap_workspace");
  });

  it("keeps the bootstrap gate disjoint: enabled tools are never in disabled_until_evidence", () => {
    const kernel = loadPlatformKernel();
    for (const tool of kernel.bootstrap_tools_enabled) {
      expect(kernel.disabled_until_evidence).not.toContain(tool);
    }
  });

  it("contains no organizational content (brand-agnostic)", () => {
    const kernel = loadPlatformKernel();
    const text = JSON.stringify(kernel).toLowerCase();
    expect(text).not.toContain("کاسیو");
    expect(text).not.toContain("casio");
    expect(text).not.toContain("alex");
  });

  it("core/ tree exists with constitution, primitives, policies, bootstrap, mcp", () => {
    for (const dir of ["constitution", "primitives", "policies", "bootstrap", "mcp"]) {
      expect(fs.existsSync(path.join(CORE_DIR, dir))).toBe(true);
    }
    expect(fs.existsSync(path.join(CORE_DIR, "constitution", "principles.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(CORE_DIR, "constitution", "firewall.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(CORE_DIR, "primitives", "evidence.schema.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(CORE_DIR, "policies", "no-fake-knowledge.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(CORE_DIR, "bootstrap", "workspace-manifest.schema.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(CORE_DIR, "mcp", "tools.yaml"))).toBe(true);
  });

  it("tool contracts load with levels 0-4", () => {
    const tools = loadKernelTools();
    expect(toolLevelFor("create_workspace")).toBe(0);
    expect(toolLevelFor("capture_field_observation")).toBe(1);
    expect(toolLevelFor("review_feedback")).toBe(2);
    expect(toolLevelFor("publish_internal_playbook")).toBe(3);
    expect(toolLevelFor("execute_automation")).toBe(4);
    expect(toolLevelFor("financial_action")).toBe(4);
    expect(tools.get("submit_feedback_intake")?.idempotency_key_required).toBe(true);
  });

  it("the General Ecosystem Spec (layer 1) loads", () => {
    const spec = loadEcosystemSpec();
    expect(spec.spec_version).toBe("0.5.0");
    expect(spec.primitive_types).toContain("evidence");
    expect(spec.mcp_tool_levels["4"]).toBe("AUTOMATION");
    expect(spec.formula).toContain("Platform");
  });
});
