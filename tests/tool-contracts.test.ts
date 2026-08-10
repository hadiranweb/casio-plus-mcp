import { describe, expect, it } from "vitest";
import { loadKernelTools } from "../services/mcp-server/src/platform-kernel.js";

const CONTRACT_FIELDS = [
  "effect_type",
  "risk_level",
  "approval_required",
  "audit_required",
  "evidence_threshold",
  "rollback_strategy",
];

describe("MCP tool contracts (core/mcp/tools.yaml, conformance)", () => {
  it("every tool declares the full contract", () => {
    const tools = loadKernelTools();
    expect(tools.size).toBeGreaterThanOrEqual(28);
    for (const [name, meta] of tools) {
      for (const field of CONTRACT_FIELDS) {
        expect(meta[field as keyof typeof meta], `${name}.${field}`).toBeDefined();
      }
      expect([0, 1, 2, 3, 4]).toContain(meta.level);
      expect(meta.required_permission, `${name}.required_permission`).toBeTruthy();
      expect(meta.required_permission).toMatch(/^(read|write|review|approve|execute|manage):/);
    }
  });

  it("review_feedback is a deprecated alias; review_proposal (2) and approve_asset (3) replace it", () => {
    const tools = loadKernelTools();
    expect(tools.get("review_feedback")?.deprecated_alias).toBe(true);
    expect(tools.get("review_feedback")?.level).toBe(2);
    expect(tools.get("review_proposal")?.level).toBe(2);
    expect(tools.get("approve_asset")?.level).toBe(3);
  });

  it("automation level-4 tools are high-risk, approval- and audit-required", () => {
    const tools = loadKernelTools();
    for (const name of ["execute_automation", "execute_approved_automation", "mutate_crm", "financial_action", "publish_external_content"]) {
      const meta = tools.get(name)!;
      expect(meta.level).toBe(4);
      expect(meta.risk_level).toBe("high");
      expect(meta.approval_required).toBe(true);
      expect(meta.audit_required).toBe(true);
    }
  });

  it("read tools are no_side_effect with risk none and no audit", () => {
    const tools = loadKernelTools();
    for (const name of ["search_playbooks", "get_playbook", "list_audit_events", "workspace_readiness"]) {
      const meta = tools.get(name)!;
      expect(meta.effect_type).toBe("no_side_effect");
      expect(meta.risk_level).toBe("none");
      expect(meta.audit_required).toBe(false);
    }
  });

  it("write tools carry a rollback strategy and evidence thresholds for level >= 3", () => {
    const tools = loadKernelTools();
    for (const name of ["submit_feedback_intake", "capture_field_observation", "create_version_proposal", "publish_internal_playbook"]) {
      const meta = tools.get(name)!;
      expect(meta.rollback_strategy).toBeTruthy();
      expect(meta.audit_required).toBe(true);
    }
    expect(tools.get("create_version_proposal")?.evidence_threshold).toBe(1);
    expect(tools.get("publish_internal_playbook")?.evidence_threshold).toBe(3);
  });
});
