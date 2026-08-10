/**
 * Migration protocol (legacy_evidence, D2) — turning the pre-kernel CasioPlus
 * data into the first workspace's evidence and assets:
 *
 *   1. migration witnesses: one evidence record with source=migration_legacy
 *      per migrated category (knowledge / feedback / proposals), observer =
 *      the installer, provenance.origin_system = casio-plus-mcp-pre-kernel,
 *      confidence 0.9, review_status accepted. Idempotent: re-running never
 *      duplicates.
 *   2. asset status: every playbook in the casio knowledge gains
 *      `asset_status: evidence_collected` (D2) — the assets enter as
 *      collected evidence, not as fabricated knowledge.
 *
 * The witness file is committed (lineage is durable); runtime evidence.json
 * stays gitignored.
 */

import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import type { Workspace } from "./workspace.js";
import type { EvidenceRecord } from "./evidence-store.js";

export const MIGRATION_WITNESS_FILE = "migration-witnesses.json";
export const MIGRATION_ORIGIN_SYSTEM = "casio-plus-mcp-pre-kernel";
export const MIGRATION_INSTALLER = "system_igniter";

export type MigrationWitness = EvidenceRecord;

export function migrationWitnessPath(ws: Workspace): string {
  return path.join(ws.dir, "evidence", MIGRATION_WITNESS_FILE);
}

export const MIGRATION_CATEGORIES = [
  {
    category: "knowledge",
    summary: "دانش کاسیو (پلی‌بوک‌ها/دارایی‌ها) از حالت pre-kernel به workspace منتقل شد و asset_status=evidence_collected گرفت.",
  },
  {
    category: "feedback",
    summary: "صف بازخورد کاسیو از data/ به workspace منتقل شد و به‌عنوان شواهد میدان ثبت شد.",
  },
  {
    category: "proposals",
    summary: "پیشنهادهای نسخه‌ای کاسیو از data/ به workspace منتقل شد و lineage آن‌ها حفظ شد.",
  },
] as const;

export function buildWitness(category: (typeof MIGRATION_CATEGORIES)[number], at: string): MigrationWitness {
  return {
    evidence_id: `evd_migration_${category.category}`,
    source: "migration_legacy",
    observer: MIGRATION_INSTALLER,
    observed_at: at,
    raw_payload: { summary: category.summary },
    related_domain: "platform",
    confidence: 0.9,
    provenance: {
      origin_system: MIGRATION_ORIGIN_SYSTEM,
      capture_method: "migration",
      capture_context: `casio-plus-mcp → element-ecosystem (workspace casio)`,
    },
    privacy_classification: "internal",
    review_status: "accepted",
    linked_assets: [],
    created_at: at,
  };
}

/** Idempotent: writes the witness file only when absent; returns existing otherwise. */
export function ensureMigrationWitnesses(ws: Workspace, now = new Date().toISOString()): MigrationWitness[] {
  const file = migrationWitnessPath(ws);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8")) as MigrationWitness[];
  }
  const witnesses = MIGRATION_CATEGORIES.map((category) => buildWitness(category, now));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(witnesses, null, 2)}\n`, "utf8");
  return witnesses;
}

/**
 * Pure: add asset_status=evidence_collected to every playbook missing it.
 * Handles the document wrapper (کاسیو:) used by the casio knowledge file.
 * Returns change count.
 */
type KnowledgeShape = {
  کاسیو?: { دارایی_ها?: { پلی_بوک_ها?: Record<string, unknown>[] } };
  دارایی_ها?: { پلی_بوک_ها?: Record<string, unknown>[] };
};

export function addAssetStatusToKnowledge(doc: Record<string, unknown>): number {
  const root = ((doc as KnowledgeShape).کاسیو ?? doc) as KnowledgeShape;
  const playbooks = root?.دارایی_ها?.پلی_بوک_ها ?? [];
  let changed = 0;
  for (const playbook of playbooks) {
    if (playbook && typeof playbook === "object" && !("asset_status" in playbook)) {
      (playbook as Record<string, unknown>).asset_status = "evidence_collected";
      changed++;
    }
  }
  return changed;
}

/**
 * Run the full migration for a workspace's knowledge file. Returns a report.
 * Surgical (line-based) so re-running never reformats the source YAML — only
 * missing `asset_status` lines are inserted.
 */
export function migrateCasioKnowledge(ws: Workspace): { changed: number; total: number } {
  const file = ws.knowledgePathAbs;
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  const playbookRe = /^( {4})- id: \d+$/;
  const total = lines.filter((line) => playbookRe.test(line)).length;
  let changed = 0;
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);
    if (playbookRe.test(line)) {
      // Idempotent: only insert when the marker isn't already right after.
      const next = lines[i + 1] ?? "";
      if (!next.includes("asset_status:")) {
        out.push("      asset_status: evidence_collected");
        changed++;
      }
    }
  }
  if (changed > 0) {
    fs.writeFileSync(file, out.join("\n"), "utf8");
  }
  return { changed, total };
}
