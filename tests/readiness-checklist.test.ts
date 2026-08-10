import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

describe("bootstrap_readiness_checklist — from docs/spec/general_ecosystem.yaml", () => {
  it("all checklist items are defined in core", () => {
    const specRaw = fs.readFileSync("docs/spec/general_ecosystem.yaml", "utf8");
    const spec: any = parse(specRaw);
    const checklist: string[] = spec.bootstrap_readiness_checklist;
    expect(checklist).toContain("kernel_version defined");
    expect(checklist).toContain("workspace manifest schema defined");
    expect(checklist).toContain("installer protocol defined");
    expect(checklist).toContain("evidence primitive defined");
    expect(checklist).toContain("MCP contracts define side effects");
    expect(checklist).toContain("automation disabled by default");
    expect(checklist).toContain("no-fake-knowledge policy active");

    // Verify each item
    expect(fs.existsSync("core/VERSION")).toBe(true);
    const versionRaw = fs.readFileSync("core/VERSION", "utf8");
    const version: any = parse(versionRaw);
    expect(version.kernel_version).toBe("0.1.0");

    expect(fs.existsSync("core/bootstrap/workspace-manifest.schema.yaml")).toBe(true);
    expect(fs.existsSync("core/bootstrap/installer-protocol.yaml")).toBe(true);
    expect(fs.existsSync("core/primitives/evidence.schema.yaml")).toBe(true);
    const toolsRaw = fs.readFileSync("core/mcp/tools.yaml", "utf8");
    const parsedTools: any = parse(toolsRaw);
    const toolsList: any[] = Array.isArray(parsedTools) ? parsedTools : parsedTools.tools;
    const hasSideEffect = toolsList.some((t: any) => t.effect_type);
    expect(hasSideEffect).toBe(true);

    // automation disabled by default = level 4 disabled_until_evidence and manifest [0,1,2]
    const manifestRaw = fs.readFileSync("workspaces/casio/manifest.yaml", "utf8");
    const manifest: any = parse(manifestRaw);
    expect(manifest.enabled_mcp_tool_levels).not.toContain(4);
    expect(manifest.disabled_capabilities).toContain("automation");

    // no-fake-knowledge policy exists and is convention
    const policyRaw = fs.readFileSync("core/policies/no-fake-knowledge.yaml", "utf8");
    const policy: any = parse(policyRaw);
    expect(policy.enforcement).toBe("convention");
  });
});
