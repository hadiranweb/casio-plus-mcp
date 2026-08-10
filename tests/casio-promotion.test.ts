import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

describe("casio-promotion — via bootstrap with real answers", () => {
  it("casio answers.yaml has real domains/owners", () => {
    const raw = fs.readFileSync("workspaces/casio/answers.yaml", "utf8");
    const ans: any = parse(raw);
    expect(ans.workspace_id).toBe("casio");
    expect(ans.installer_id).toBeTruthy();
    expect(ans.domains).toContain("sales");
    expect(ans.owners.sales).toBe("sales_lead");
    expect(ans.note).toContain("migrated_pre_kernel");
  });

  it("casio manifest has field_discovery and lineage from migration", () => {
    const raw = fs.readFileSync("workspaces/casio/manifest.yaml", "utf8");
    const m: any = parse(raw);
    expect(m.status).toBe("field_discovery");
    expect(m.created_from_kernel_version).toBe("0.1.0");
    expect(m.bootstrap_run_id).toMatch(/^bootstrap_/);
    expect(m.enabled_mcp_tool_levels).toEqual([0, 1, 2]);
    // verify passes
  });

  it("casio verify green via CLI logic", async () => {
    const { loadWorkspace } = await import("../src/workspace.js");
    const ws = loadWorkspace("casio");
    expect(ws.manifest?.status).toBe("field_discovery");
    // Level 1 should be enabled for casio
    const { canEnableTool } = await import("../src/workspace.js");
    expect(canEnableTool(ws, "capture_field_observation").enabled).toBe(true);
    expect(canEnableTool(ws, "create_version_proposal").enabled).toBe(true);
  });
});
