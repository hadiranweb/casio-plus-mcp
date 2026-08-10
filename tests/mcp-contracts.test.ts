import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

describe("MCP contracts conformance — tools.yaml defines side effects", () => {
  it("each tool has required contract fields", () => {
    const raw = fs.readFileSync("core/mcp/tools.yaml", "utf8");
    const parsed: any = parse(raw);
    const tools: any[] = Array.isArray(parsed) ? parsed : parsed.tools;
    // filter entries that are tools (have tool_name)
    const toolEntries = tools.filter((t) => t.tool_name);
    expect(toolEntries.length).toBeGreaterThan(10);
    for (const t of toolEntries) {
      expect(t.tool_name, "missing tool_name").toBeTruthy();
      expect(typeof t.tool_level, `missing tool_level for ${t.tool_name}`).toBe("number");
      expect(t.effect_type, `missing effect_type for ${t.tool_name}`).toBeTruthy();
      expect(t.risk_level, `missing risk_level for ${t.tool_name}`).toMatch(/low|medium|high/);
      expect(typeof t.approval_required, `missing approval_required for ${t.tool_name}`).toBe("boolean");
      expect(typeof t.audit_required, `missing audit_required for ${t.tool_name}`).toBe("boolean");
      expect(typeof t.evidence_threshold, `missing evidence_threshold for ${t.tool_name}`).toBe("number");
      // rollback_strategy required unless no_side_effect
      if (t.effect_type !== "no_side_effect") {
        expect(t.rollback_strategy, `missing rollback for ${t.tool_name}`).toBeTruthy();
      }
    }
  });

  it("level mapping covers all 5 levels and deprecated alias exists", () => {
    const raw = fs.readFileSync("core/mcp/tools.yaml", "utf8");
    const parsed2: any = parse(raw);
    const tools2: any[] = Array.isArray(parsed2) ? parsed2 : parsed2.tools;
    const levels = new Set(tools2.filter((t) => t.tool_name).map((t) => t.tool_level));
    expect(levels.has(0)).toBe(true);
    expect(levels.has(1)).toBe(true);
    expect(levels.has(2)).toBe(true);
    expect(levels.has(3)).toBe(true);
    expect(levels.has(4)).toBe(true);
    const alias = tools2.find((t) => t.tool_name === "review_feedback");
    expect(alias).toBeTruthy();
    expect(alias.deprecated_alias).toBe(true);
    expect(alias.alias_for).toBe("review_proposal");
  });

  it("tools have workspace param where required (spec table)", () => {
    const raw = fs.readFileSync("core/mcp/tools.yaml", "utf8");
    const parsed3: any = parse(raw);
    const tools3: any[] = Array.isArray(parsed3) ? parsed3 : parsed3.tools;
    const search = tools3.find((t) => t.tool_name === "search_playbooks");
    expect(search.input_schema.properties.workspace).toBeTruthy();
    expect(search.input_schema.properties.workspace_id).toBeTruthy();
  });
});
