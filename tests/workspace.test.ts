import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  bootstrapWorkspace,
  canEnableTool,
  defaultWorkspaceId,
  evidenceCount,
  getWorkspace,
  listWorkspaces,
  loadWorkspace,
  readinessFor,
  workspaceReadiness,
  workspaceSummary,
} from "../src/workspace.js";
import { loadKnowledge } from "../src/knowledge-store.js";
import { validateFeedback } from "../src/quality.js";
import { submitFeedback } from "../src/intake-store.js";
import { reviewFeedback } from "../src/intake-store.js";
import type { FeedbackInput } from "../src/quality.js";

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
      const submitted = submitFeedback(record, report, `${ws.dataDirAbs}/feedback-intake.json`);
      reviewFeedback(submitted.record.id, "approved", "reviewer", "شواهد واقعی میدان است.", `${ws.dataDirAbs}/feedback-intake.json`);
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
});
