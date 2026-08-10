import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
// Codegen (D3): the validator comes from core/primitives/evidence.schema.yaml
import { evidenceSchema } from "../services/mcp-server/src/generated/schemas.js";

/**
 * Evidence Store — the field-evidence primitive of the Element Ecosystem.
 *
 * Evidence is the raw material of organizational memory: a real observation
 * from the field (coaching session, customer interaction, automation run,
 * manual observation). Evidence enters a workspace UNREVIEWED, gets triaged
 * (accepted/rejected), and only accepted evidence counts toward workspace
 * readiness and (later) version proposals.
 *
 * Shape mirrors core/primitives/evidence.schema.yaml. Store lives in the
 * workspace's data dir (gitignored): <dataDir>/evidence.json.
 */

export const EvidenceReviewStatusSchema = z.enum(["unreviewed", "triaged", "accepted", "rejected"]);
export type EvidenceReviewStatus = z.infer<typeof EvidenceReviewStatusSchema>;

/** The codegen validator (from core/primitives/evidence.schema.yaml). */
export const EvidenceRecordSchema = evidenceSchema;
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export type EvidenceInput = {
  source?: string;
  observer: string;
  summary: string;
  details?: string;
  related_domain: string;
  confidence?: number;
  origin_system?: string;
  capture_method?: string;
  capture_context?: string;
  privacy_classification?: "internal" | "confidential";
};

export type EvidenceWorkspace = { dataDirAbs: string };

export function evidenceStorePath(ws: EvidenceWorkspace): string {
  return path.join(ws.dataDirAbs, "evidence.json");
}

function readEvidence(ws: EvidenceWorkspace): EvidenceRecord[] {
  const p = evidenceStorePath(ws);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p)) fs.writeFileSync(p, "[]\n", "utf8");
  const raw = fs.readFileSync(p, "utf8").trim();
  return z.array(EvidenceRecordSchema).parse(raw ? JSON.parse(raw) : []);
}

function writeEvidence(ws: EvidenceWorkspace, records: EvidenceRecord[]): void {
  const p = evidenceStorePath(ws);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, p);
}

/** Level 1 tool: capture a real field observation into the workspace. */
export function captureEvidence(ws: EvidenceWorkspace, input: EvidenceInput): EvidenceRecord {
  const summary = input.summary.trim();
  if (summary.length < 5) throw new Error("evidence_summary_too_short");
  const record: EvidenceRecord = {
    evidence_id: `evd_${randomUUID()}`,
    source: input.source ?? "field_observation",
    observer: input.observer.trim(),
    observed_at: new Date().toISOString(),
    raw_payload: { summary, details: input.details?.trim() || undefined },
    related_domain: input.related_domain.trim(),
    confidence: input.confidence ?? 0.5,
    provenance: {
      origin_system: input.origin_system ?? "casio-operator",
      capture_method: input.capture_method ?? "manual_observation",
      capture_context: input.capture_context?.trim() || undefined,
    },
    privacy_classification: input.privacy_classification ?? "internal",
    review_status: "unreviewed",
    linked_assets: [],
    created_at: new Date().toISOString(),
  };
  const records = readEvidence(ws);
  records.push(record);
  writeEvidence(ws, records);
  return record;
}

export function listEvidence(ws: EvidenceWorkspace, opts: { reviewStatus?: EvidenceReviewStatus; relatedDomain?: string; limit?: number } = {}): EvidenceRecord[] {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return readEvidence(ws)
    .filter((record) => !opts.reviewStatus || record.review_status === opts.reviewStatus)
    .filter((record) => !opts.relatedDomain || record.related_domain === opts.relatedDomain)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

/** Level 2 flow: triage evidence (accepted / rejected). */
export function triageEvidence(ws: EvidenceWorkspace, evidenceId: string, decision: "accepted" | "rejected", by: string): EvidenceRecord {
  const records = readEvidence(ws);
  const index = records.findIndex((record) => record.evidence_id === evidenceId);
  if (index < 0) throw new Error(`evidence_not_found:${evidenceId}`);
  if (records[index].review_status !== "unreviewed" && records[index].review_status !== "triaged") {
    throw new Error(`evidence_already_decided:${records[index].review_status}`);
  }
  records[index] = {
    ...records[index],
    review_status: decision,
    provenance: { ...records[index].provenance, capture_context: records[index].provenance.capture_context ?? by },
  };
  writeEvidence(ws, records);
  return records[index];
}

/** Number of accepted evidence records — the real-evidence fuel of readiness. */
export function evidenceAcceptedCount(ws: EvidenceWorkspace): number {
  return listEvidence(ws, { reviewStatus: "accepted" }).length;
}
