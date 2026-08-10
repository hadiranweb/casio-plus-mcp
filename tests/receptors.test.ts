import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { workspaceReceptors } from "../src/receptors.js";
import { bootstrapWorkspace, defaultWorkspaceId, getWorkspace } from "../src/workspace.js";
import type { FeedbackInput } from "../src/quality.js";

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_WORKSPACES_DIR;
  delete process.env.CASIO_WORKSPACES_DATA_DIR;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-receptors-"));
  dirs.push(d);
  process.env.CASIO_WORKSPACES_DIR = d;
  process.env.CASIO_WORKSPACES_DATA_DIR = path.join(d, "data");
  return d;
}

describe("workspace receptors (shared contracts between island and hub)", () => {
  it("the built-in casio workspace is registered and resolvable", () => {
    const ws = getWorkspace("casio");
    expect(ws).toBeDefined();
    expect(ws!.config.displayName).toBe("کاسیو پلاس");
    expect(fs.existsSync(ws!.knowledgePathAbs)).toBe(true); // knowledge/casio.yaml
  });

  it("binds knowledge/feedback/audit receptors to a workspace's own stores", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    // minimal valid knowledge with one playbook so search/validate work
    fs.copyFileSync(path.resolve(__dirname, "fixtures", "knowledge-min.yaml"), ws.knowledgePathAbs);
    const rec = workspaceReceptors(ws);
    expect(rec.knowledge.kind).toBe("knowledge");
    expect(rec.feedback.kind).toBe("feedback");
    expect(rec.audit.kind).toBe("audit");

    // knowledge receptor reads THIS workspace's knowledge
    const playbook = rec.knowledge.getPlaybook(1);
    expect(playbook?.نام_پلی_بوک).toBe("پلی‌بوک تست");

    // feedback receptor writes into THIS workspace's data dir
    const input: FeedbackInput = {
      sourceSystem: "casio-operator",
      sourceType: "observation",
      submittedBy: "coach-1",
      relatedAssetId: 1,
      summary: "مشاهدهٔ واقعی میدان دربارهٔ فرایند فروش و نیاز به مثال عملی بیشتر در فرم جلسه.",
      occurredAt: "2026-08-09T12:00:00.000Z",
      payload: {},
    };
    const report = rec.knowledge.validate(input);
    expect(report.valid).toBe(true);
    const submitted = rec.feedback.submit(input, report);
    const records = rec.feedback.listQueue();
    expect(records).toHaveLength(1);
    // audit receptor records into the same workspace
    const audit = rec.audit.record({ action: "test", actor: "tester", entityType: "feedback", entityId: (submitted.record as { id: string }).id, details: {} });
    expect(rec.audit.list().length).toBe(1);
    expect((audit as { id: string }).id).toMatch(/^audit_/);
  });

  it("default workspace id is casio", () => {
    expect(defaultWorkspaceId()).toBe("casio");
  });
});
