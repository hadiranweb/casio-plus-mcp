import { describe, expect, it } from "vitest";
import { loadPlatformKernel } from "../src/platform-kernel.js";

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
});
