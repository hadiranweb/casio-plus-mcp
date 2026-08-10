import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assignOwner,
  bootstrapWorkspace,
  canEnableTool,
  defaultWorkspaceId,
  defineDomain,
  evidenceCount,
  getWorkspace,
  listWorkspaces,
  loadWorkspace,
  loadWorkspaceManifest,
  readinessFor,
  workspaceReadiness,
  workspaceSummary,
  wsStorePaths,
} from "../services/mcp-server/src/workspace.js";
import { captureEvidence, triageEvidence } from "../services/mcp-server/src/evidence-store.js";
import { loadKnowledge } from "../services/mcp-server/src/knowledge-store.js";
import { validateFeedback } from "../services/mcp-server/src/quality.js";
import { submitFeedback } from "../services/mcp-server/src/intake-store.js";
import { reviewFeedback } from "../services/mcp-server/src/intake-store.js";
import type { FeedbackInput } from "../services/mcp-server/src/quality.js";

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_WORKSPACES_DIR;
  delete process.env.CASIO_WORKSPACES_DATA_DIR;
  delete process.env.CASIO_WORKSPACE;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-ws-"));
  dirs.push(d);
  process.env.CASIO_WORKSPACES_DIR = d;
  process.env.CASIO_WORKSPACES_DATA_DIR = path.join(d, "data");
  return d;
}

function knowledgeForTests(wsDir: string): unknown {
  // seed a minimal valid knowledge doc with one playbook so validation has a reference
  const knowledgePath = path.join(wsDir, "acme", "knowledge.yaml");
  fs.copyFileSync(path.resolve(__dirname, "fixtures", "knowledge-min.yaml"), knowledgePath);
  return knowledgePath;
}

describe("workspace bootstrap (empty-but-guided, no fake content)", () => {
  it("bootstraps a workspace with needs-definition statuses and zero evidence", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme Co" }, d);
    expect(ws.config.id).toBe("acme");
    expect(ws.config.displayName).toBe("Acme Co");
    expect(ws.config.bootstrap.organization_profile).toBe("needs_definition");
    expect(ws.config.bootstrap.playbooks).toBe("templates_only");
    expect(ws.config.bootstrap.automation_specs).toBe("disabled_until_approved");
    expect(evidenceCount(ws)).toBe(0);
    expect(workspaceReadiness(ws)).toBe("bootstrap");
    // knowledge vessel is a guided empty doc, not content
    const knowledge = fs.readFileSync(ws.knowledgePathAbs, "utf8");
    expect(knowledge).toContain("needs_definition");
    // runtime data dir exists
    expect(fs.existsSync(ws.dataDirAbs)).toBe(true);
    // the spec-shaped manifest identity is written
    const manifest = loadWorkspaceManifest("acme", d)!;
    expect(manifest.installer_id).toBe("system_igniter");
    expect(manifest.status).toBe("bootstrapped_empty");
    expect(manifest.enabled_mcp_tool_levels).toEqual([0, 1]);
    expect(manifest.created_from_specification_version).toBeTruthy();
    expect(manifest.audit_log_enabled).toBe(true);
    expect(manifest.data_quality_gate_enabled).toBe(true);
  });

  it("rejects invalid ids and duplicate bootstrap", () => {
    const d = setup();
    expect(() => bootstrapWorkspace({ id: "Bad ID", displayName: "x" }, d)).toThrow("workspace_id_invalid");
    bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    expect(() => bootstrapWorkspace({ id: "acme", displayName: "Again" }, d)).toThrow("workspace_already_exists");
  });

  it("lists and loads workspaces from the registry dir", () => {
    const d = setup();
    bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    bootstrapWorkspace({ id: "xyz", displayName: "XYZ" }, d);
    const all = listWorkspaces(d);
    expect(all.map((w) => w.config.id).sort()).toEqual(["acme", "xyz"]);
    expect(getWorkspace("acme", d)?.config.displayName).toBe("Acme");
    expect(getWorkspace("missing", d)).toBeUndefined();
  });

  it("default workspace id comes from env or falls back to casio", () => {
    expect(defaultWorkspaceId()).toBe("casio");
    process.env.CASIO_WORKSPACE = "acme";
    expect(defaultWorkspaceId()).toBe("acme");
  });

  it("readiness grows with approved evidence and gates dangerous tools", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    knowledgeForTests(d);

    // dangerous tools are off at bootstrap
    expect(canEnableTool(ws, "execute_automation").enabled).toBe(false);
    expect(canEnableTool(ws, "financial_action").enabled).toBe(false);
    // bootstrap tools are on
    expect(canEnableTool(ws, "create_asset_from_template").enabled).toBe(true);
    expect(canEnableTool(ws, "validate_record").enabled).toBe(true);

    // approve 3 real field records → forming → dangerous tools unlock
    const knowledge = loadKnowledge(ws.knowledgePathAbs);
    const input: FeedbackInput = {
      sourceSystem: "casio-operator",
      sourceType: "observation",
      submittedBy: "coach-1",
      relatedAssetId: 1,
      summary: "مشاهدهٔ واقعی میدان: گلوگاه در پیگیری مشتری بود و نیاز به مثال عملی بیشتر در فرم است.",
      occurredAt: "2026-08-09T12:00:00.000Z",
      payload: {},
    };
    for (let i = 0; i < 3; i++) {
      // distinct real field observations — identical records would (correctly)
      // be quarantined as duplicates by the exact-fingerprint dedup
      const record = { ...input, summary: `${input.summary} (مورد ${i + 1})` };
      const report = validateFeedback(record, knowledge as never);
      const submitted = submitFeedback(record, report, wsStorePaths(ws).intake);
      reviewFeedback(submitted.record.id, "approved", "reviewer", "شواهد واقعی میدان است.", wsStorePaths(ws).intake);
    }
    expect(evidenceCount(ws)).toBe(3);
    expect(workspaceReadiness(ws)).toBe("forming");
    expect(canEnableTool(ws, "execute_automation").enabled).toBe(true);
    expect(canEnableTool(ws, "approve_high_risk_action").enabled).toBe(true);
  });

  it("readinessFor thresholds are sane", () => {
    expect(readinessFor(0)).toBe("bootstrap");
    expect(readinessFor(2)).toBe("bootstrap");
    expect(readinessFor(3)).toBe("forming");
    expect(readinessFor(10)).toBe("mature");
    expect(readinessFor(50)).toBe("mature");
  });

  it("workspace summary exposes id, displayName, readiness and enabled tools", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    const summary = workspaceSummary(ws);
    expect(summary.id).toBe("acme");
    expect(summary.displayName).toBe("Acme");
    expect(summary.evidenceCount).toBe(0);
    expect(summary.enabledTools).toContain("create_workspace");
    expect(summary.enabledTools).not.toContain("execute_automation");
    expect(loadWorkspace("acme", d).config.id).toBe("acme");
  });

  it("define_domain and assign_owner shape the workspace (level 0 tools)", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    defineDomain(ws, { domainId: "sales", domainName: "فروش و بازاریابی" });
    const ws2 = loadWorkspace("acme", d);
    expect(ws2.config.domains).toHaveLength(1);
    expect(ws2.config.bootstrap.domains).toBe("mapped");
    assignOwner(ws2, { ownerId: "sales_lead", domainId: "sales" });
    const ws3 = loadWorkspace("acme", d);
    expect(ws3.config.domains[0].ownerId).toBe("sales_lead");
    assignOwner(ws3, { ownerId: "hadiranweb" });
    expect(loadWorkspace("acme", d).config.ownerId).toBe("hadiranweb");
    expect(() => assignOwner(ws3, { ownerId: "x", domainId: "missing" })).toThrow("domain_not_found");
    expect(() => defineDomain(ws3, { domainId: "", domainName: "x" })).toThrow("domain_id_required");
  });

  it("tool levels gate: a level-4 tool stays off when the workspace caps levels", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    ws.config.enabledToolLevels = [0, 1];
    expect(canEnableTool(ws, "capture_field_observation").enabled).toBe(true); // level 1
    expect(canEnableTool(ws, "review_feedback").enabled).toBe(false); // level 2
    expect(canEnableTool(ws, "execute_automation").enabled).toBe(false); // level 4
    expect(canEnableTool(ws, "create_workspace").enabled).toBe(true); // level 0
  });

  it("accepted evidence counts toward readiness and unlocks dangerous tools", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    expect(ws.config.enabledToolLevels).toEqual([0, 1, 2, 3, 4]);
    for (let i = 0; i < 3; i++) {
      const ev = captureEvidence(ws, {
        observer: `coach-${i}`,
        summary: `مشاهده واقعی میدان شماره ${i}: گلوگاه در پیگیری مشتری و نیاز به مثال عملی بیشتر در فرم`,
        related_domain: "sales",
      });
      triageEvidence(ws, ev.evidence_id, "accepted", "reviewer");
    }
    expect(evidenceCount(ws)).toBe(3);
    expect(workspaceReadiness(ws)).toBe("forming");
    expect(canEnableTool(ws, "execute_automation").enabled).toBe(true);
    expect(canEnableTool(ws, "financial_action").enabled).toBe(true);
  });
});
