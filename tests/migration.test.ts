import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bootstrapWorkspace, loadWorkspace, getWorkspace } from "../services/mcp-server/src/workspace.js";
import {
  addAssetStatusToKnowledge,
  buildWitness,
  ensureMigrationWitnesses,
  MIGRATION_CATEGORIES,
  MIGRATION_ORIGIN_SYSTEM,
  migrateCasioKnowledge,
  migrationWitnessPath,
} from "../services/mcp-server/src/migration.js";

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_WORKSPACES_DIR;
  delete process.env.CASIO_WORKSPACES_DATA_DIR;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-mig-"));
  dirs.push(d);
  process.env.CASIO_WORKSPACES_DIR = d;
  process.env.CASIO_WORKSPACES_DATA_DIR = path.join(d, "data");
  return d;
}

describe("migration protocol (legacy_evidence, D2)", () => {
  it("builds a migration witness with the required lineage fields", () => {
    const w = buildWitness(MIGRATION_CATEGORIES[0], "2026-08-10T10:00:00Z");
    expect(w.source).toBe("migration_legacy");
    expect(w.observer).toBe("system_igniter");
    expect(w.provenance.origin_system).toBe(MIGRATION_ORIGIN_SYSTEM);
    expect(w.confidence).toBe(0.9);
    expect(w.review_status).toBe("accepted");
    expect(w.evidence_id).toBe("evd_migration_knowledge");
  });

  it("ensureMigrationWitnesses is idempotent and covers all three categories", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    const first = ensureMigrationWitnesses(ws);
    expect(first).toHaveLength(3);
    expect(first.map((w) => w.evidence_id).sort()).toEqual(
      ["evd_migration_knowledge", "evd_migration_feedback", "evd_migration_proposals"].sort(),
    );
    const second = ensureMigrationWitnesses(ws);
    expect(second).toHaveLength(3); // no duplicates
    expect(fs.existsSync(migrationWitnessPath(ws))).toBe(true);
  });

  it("addAssetStatusToKnowledge marks every playbook evidence_collected, once", () => {
    const doc = {
      کاسیو: {
        دارایی_ها: {
          پلی_بوک_ها: [{ id: 1, title: "a" }, { id: 2, title: "b", asset_status: "published" }],
        },
      },
    };
    expect(addAssetStatusToKnowledge(doc)).toBe(1);
    const playbooks = (doc as never as { کاسیو: { دارایی_ها: { پلی_بوک_ها: Record<string, unknown>[] } } }).کاسیو.دارایی_ها.پلی_بوک_ها;
    expect(playbooks[0].asset_status).toBe("evidence_collected");
    expect(playbooks[1].asset_status).toBe("published"); // untouched
    expect(addAssetStatusToKnowledge(doc)).toBe(0); // idempotent
  });

  it("migrateCasioKnowledge is surgical: same result and no reformatting on re-run", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    fs.writeFileSync(
      ws.knowledgePathAbs,
      "کاسیو:\n  دارایی_ها:\n    پلی_بوک_ها:\n    - id: 1\n      نام_پلی_بوک: تست\n    - id: 2\n      نام_پلی_بوک: تست دو\n",
    );
    const first = migrateCasioKnowledge(ws);
    expect(first).toEqual({ changed: 2, total: 2 });
    const afterFirst = fs.readFileSync(ws.knowledgePathAbs, "utf8");
    expect(afterFirst).toContain("asset_status: evidence_collected");
    const second = migrateCasioKnowledge(ws);
    expect(second).toEqual({ changed: 0, total: 2 }); // idempotent: nothing new to insert
    expect(fs.readFileSync(ws.knowledgePathAbs, "utf8")).toBe(afterFirst); // byte-identical
  });

  it("the committed casio workspace carries witnesses and evidence_collected assets", () => {
    const ws = getWorkspace("casio");
    expect(ws).toBeDefined();
    const witnesses = JSON.parse(fs.readFileSync(migrationWitnessPath(ws!), "utf8"));
    expect(witnesses).toHaveLength(3);
    expect(witnesses.every((w: { source: string }) => w.source === "migration_legacy")).toBe(true);
    const knowledge = fs.readFileSync(ws!.knowledgePathAbs, "utf8");
    const playbookMarks = knowledge.split("asset_status: evidence_collected").length - 1;
    expect(playbookMarks).toBeGreaterThanOrEqual(56);
  });
});
