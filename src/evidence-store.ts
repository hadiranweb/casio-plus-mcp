import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { normalizedSimilarity } from "./text-similarity.js";

const moduleDir = path.dirname(new URL(import.meta.url).pathname);
export const DEFAULT_EVIDENCE_PATH = path.resolve(moduleDir, "../data/evidence.json");

/**
 * Evidence Primitive — مهم‌ترین primitive
 * هر دانش معتبر از Evidence شروع می‌شود: مشاهده واقعی میدان → Quality Gate → Review → Proposal
 * Phase 2: full lifecycle + triage + promote + binary ref + confidence default 0.5
 */

export const evidenceSchema = z.object({
  evidence_id: z.string().regex(/^evd_[0-9]{4}_[0-9]{2}_[0-9]{2}_[0-9]+$/),
  source: z.enum(["field_observation", "coaching_session", "customer_interaction", "automation_runtime", "manual_observation", "external_system", "manual_inventory", "pilot_result", "tool_usage_log", "migration_legacy"]),
  observer: z.string().min(2),
  observed_at: z.string().datetime({ offset: true }),
  related_domain: z.string().min(1),
  related_asset_id: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  raw_payload: z.object({
    summary: z.string().min(20).max(5000),
    details: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    payload_ref: z.string().optional().describe("ارجاع به فایل باینری بیرونی — هرگز commit نمی‌شود"),
  }),
  provenance: z.object({
    origin_system: z.string(),
    capture_method: z.enum(["manual_observation", "form_submission", "api_import", "coaching_session"]),
    capture_context: z.string().optional(),
    idempotency_key: z.string().optional(),
  }),
  privacy_classification: z.enum(["public", "internal", "sensitive", "restricted"]).default("internal"),
  review_status: z.enum(["unreviewed", "triaged", "accepted", "rejected", "needs_more_evidence", "converted_to_proposal"]).default("unreviewed"),
  linked_assets: z.array(z.string()).default([]),
  receivedAt: z.string().datetime({ offset: true }).optional(),
  qualityStatus: z.enum(["raw", "quarantined", "validated", "rejected"]).optional(),
  fingerprint: z.string().optional(),
  // Phase 2 triage fields
  triage: z.object({
    evidence_type: z.enum(["knowledge_gap", "process_issue", "data_quality", "opportunity"]).optional(),
    destination_asset: z.string().optional(),
    destination_domain: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    triaged_by: z.string().optional(),
    triaged_at: z.string().datetime({ offset: true }).optional(),
  }).optional(),
  // lineage for promote
  promoted_from_feedback: z.string().optional(),
});

export type Evidence = z.infer<typeof evidenceSchema> & {
  id: string; // alias for evidence_id for internal use
  workspace: string;
};

export const captureEvidenceInputSchema = z.object({
  workspace: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).optional(),
  source: z.enum(["field_observation", "coaching_session", "customer_interaction", "automation_runtime", "manual_observation", "external_system", "manual_inventory", "pilot_result", "tool_usage_log", "migration_legacy"]).default("field_observation"),
  observer: z.string().min(2).max(160).default("process_coach"),
  observed_at: z.string().datetime({ offset: true }).optional(),
  related_domain: z.string().min(1).max(100),
  related_asset_id: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  summary: z.string().trim().min(20).max(5000),
  details: z.string().optional(),
  payload_ref: z.string().optional().describe("مسیر فایل باینری بیرونی"),
  provenance_origin_system: z.string().optional(),
  provenance_capture_method: z.enum(["manual_observation", "form_submission", "api_import", "coaching_session"]).optional(),
  provenance_capture_context: z.string().optional(),
  provenance_idempotency_key: z.string().optional(),
  privacy_classification: z.enum(["public", "internal", "sensitive", "restricted"]).optional(),
});

export type CaptureEvidenceInput = z.input<typeof captureEvidenceInputSchema>;
export type ParsedCaptureInput = z.infer<typeof captureEvidenceInputSchema>;

function ensureStore(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]\n", "utf8");
  }
}

export function loadEvidence(filePath = DEFAULT_EVIDENCE_PATH): Evidence[] {
  ensureStore(filePath);
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Evidence store must contain JSON array: ${filePath}`);
  return parsed as Evidence[];
}

function writeEvidence(records: Evidence[], filePath: string): void {
  ensureStore(filePath);
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
}

function fingerprintOf(input: ParsedCaptureInput): string {
  const stable = JSON.stringify({
    source: input.source,
    related_domain: input.related_domain.toLowerCase(),
    summary: input.summary.trim().replace(/\s+/g, " ").toLowerCase(),
    related_asset_id: input.related_asset_id ?? null,
  });
  let hash = 0;
  for (let i = 0; i < stable.length; i++) hash = (hash * 31 + stable.charCodeAt(i)) >>> 0;
  return `evd_fp_${hash.toString(16).padStart(8, "0")}`;
}

const FUZZY_THRESHOLD = 0.92;
const FUZZY_MIN = 40;
const FUZZY_MAX = 600;

function findFuzzyDuplicate(records: Evidence[], input: ParsedCaptureInput): Evidence | undefined {
  const candidates = records.filter((r) => r.review_status !== "rejected").slice(-100);
  for (const r of candidates) {
    if (r.related_domain !== input.related_domain) continue;
    const a = input.summary.trim();
    const b = r.raw_payload.summary.trim();
    if (a.length < FUZZY_MIN || b.length < FUZZY_MIN) continue;
    if (Math.max(a.length, b.length) > FUZZY_MAX) continue;
    if (normalizedSimilarity(a, b) >= FUZZY_THRESHOLD) return r;
  }
  return undefined;
}

export type CaptureResult = {
  evidence: Evidence;
  fuzzyDuplicateOf?: string;
  duplicateOf?: string;
};

export function captureFieldObservation(
  input: CaptureEvidenceInput,
  workspaceId: string,
  filePath = DEFAULT_EVIDENCE_PATH,
): CaptureResult {
  const parsed = captureEvidenceInputSchema.parse(input) as ParsedCaptureInput;
  const normInput = parsed;
  const records = loadEvidence(filePath);
  const fp = fingerprintOf(normInput);
  // Idempotency: check by fingerprint or idempotency_key
  const idempotencyKey = normInput.provenance_idempotency_key;
  if (idempotencyKey) {
    const existing = records.find((r) => (r.provenance as any)?.idempotency_key === idempotencyKey);
    if (existing) {
      return { evidence: existing, duplicateOf: existing.evidence_id };
    }
  }
  const duplicate = records.find((r) => r.fingerprint === fp && r.review_status !== "rejected");

  let fuzzyDuplicateOf: string | undefined;
  if (!duplicate) {
    const fuzzy = findFuzzyDuplicate(records, normInput);
    if (fuzzy) fuzzyDuplicateOf = fuzzy.evidence_id;
  }

  const now = new Date().toISOString();
  const shortId = `evd_${now.slice(0, 10).replace(/-/g, "_")}_${String(records.length + 1).padStart(3, "0")}`;

  // Guard: binary payload must be ref only, not committed
  if (normInput.payload_ref) {
    // Ensure file exists if ref provided (for validation), but don't embed binary
    const refPath = normInput.payload_ref;
    // If ref is absolute or relative, check existence if it's a local path and not http
    if (!refPath.startsWith("http") && !refPath.startsWith("/tmp") && fs.existsSync(refPath)) {
      // ok
    } else if (refPath.includes("..") && fs.existsSync(path.resolve(refPath))) {
      // ok
    }
    // Do not allow committing binary: ensure evidence/ dir is gitignored for binary? Just store ref
  }

  const evidence: Evidence = {
    evidence_id: shortId,
    id: shortId,
    workspace: workspaceId,
    source: normInput.source as any,
    observer: normInput.observer,
    observed_at: normInput.observed_at ?? now,
    related_domain: normInput.related_domain,
    related_asset_id: normInput.related_asset_id ?? null,
    confidence: normInput.confidence ?? 0.5,
    raw_payload: {
      summary: normInput.summary,
      details: normInput.details,
      payload_ref: normInput.payload_ref,
    },
    provenance: {
      origin_system: normInput.provenance_origin_system ?? "manual",
      capture_method: normInput.provenance_capture_method ?? "manual_observation",
      capture_context: normInput.provenance_capture_context,
      idempotency_key: normInput.provenance_idempotency_key ?? fp,
    },
    privacy_classification: normInput.privacy_classification ?? "internal",
    review_status: "unreviewed",
    linked_assets: [],
    receivedAt: now,
    qualityStatus: duplicate ? "quarantined" : "validated",
    fingerprint: fp,
  };

  if (duplicate) {
    const quarantined: Evidence = {
      ...evidence,
      evidence_id: `evd_${now.slice(0, 10).replace(/-/g, "_")}_${String(records.length + 1).padStart(3, "0")}`,
      id: `evd_${now.slice(0, 10).replace(/-/g, "_")}_${String(records.length + 1).padStart(3, "0")}`,
      review_status: "unreviewed",
      qualityStatus: "quarantined",
    };
    records.push(quarantined);
    writeEvidence(records, filePath);
    return { evidence: quarantined, duplicateOf: duplicate.evidence_id, fuzzyDuplicateOf };
  }

  records.push(evidence);
  writeEvidence(records, filePath);
  return { evidence, fuzzyDuplicateOf, duplicateOf: undefined };
}

export function listEvidence(
  filters: { related_domain?: string; review_status?: Evidence["review_status"]; source?: string; limit?: number } = {},
  filePath = DEFAULT_EVIDENCE_PATH,
): Evidence[] {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  return loadEvidence(filePath)
    .filter((r) => !filters.related_domain || r.related_domain === filters.related_domain)
    .filter((r) => !filters.review_status || r.review_status === filters.review_status)
    .filter((r) => !filters.source || r.source === filters.source)
    .sort((a, b) => (b.observed_at ?? b.receivedAt ?? "").localeCompare(a.observed_at ?? a.receivedAt ?? ""))
    .slice(0, limit);
}

export const triageInputSchema = z.object({
  evidence_type: z.enum(["knowledge_gap", "process_issue", "data_quality", "opportunity"]),
  destination_asset: z.string().optional(),
  destination_domain: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export type TriageInput = z.infer<typeof triageInputSchema>;

export function triageEvidence(
  evidenceId: string,
  triage: TriageInput,
  reviewer: string,
  filePath = DEFAULT_EVIDENCE_PATH,
): Evidence {
  const records = loadEvidence(filePath);
  const idx = records.findIndex((r) => r.evidence_id === evidenceId || r.id === evidenceId);
  if (idx < 0) throw new Error(`Evidence not found: ${evidenceId}`);
  const rec = records[idx];
  if (rec.review_status !== "unreviewed" && rec.review_status !== "needs_more_evidence") {
    throw new Error(`Evidence ${evidenceId} cannot be triaged from ${rec.review_status}`);
  }
  const updated: Evidence = {
    ...rec,
    review_status: "triaged",
    triage: {
      evidence_type: triage.evidence_type,
      destination_asset: triage.destination_asset,
      destination_domain: triage.destination_domain,
      priority: triage.priority,
      triaged_by: reviewer,
      triaged_at: new Date().toISOString(),
    },
  };
  records[idx] = updated;
  writeEvidence(records, filePath);
  return updated;
}

export function reviewEvidence(
  evidenceId: string,
  decision: "accepted" | "rejected" | "triaged" | "needs_more_evidence" | "converted_to_proposal",
  reviewer: string,
  note: string,
  filePath = DEFAULT_EVIDENCE_PATH,
): Evidence {
  const records = loadEvidence(filePath);
  const idx = records.findIndex((r) => r.evidence_id === evidenceId || r.id === evidenceId);
  if (idx < 0) throw new Error(`Evidence not found: ${evidenceId}`);
  const rec = records[idx];
  // Allowed transitions: unreviewed → triaged, triaged → accepted/rejected/needs_more_evidence, needs_more_evidence → triaged, accepted → converted_to_proposal
  const allowed: Record<string, string[]> = {
    unreviewed: ["triaged", "accepted", "rejected", "needs_more_evidence"],
    triaged: ["accepted", "rejected", "needs_more_evidence"],
    needs_more_evidence: ["triaged", "accepted", "rejected"],
    accepted: ["converted_to_proposal", "rejected"],
    rejected: [],
    converted_to_proposal: [],
  };
  if (!allowed[rec.review_status]?.includes(decision)) {
    throw new Error(`invalid_evidence_transition:${rec.review_status}→${decision}`);
  }
  const updated: Evidence = {
    ...rec,
    review_status: decision as Evidence["review_status"],
    raw_payload: {
      ...rec.raw_payload,
      details: rec.raw_payload.details ? `${rec.raw_payload.details}\n[review:${reviewer}] ${note}` : `[review:${reviewer}] ${note}`,
    },
  };
  records[idx] = updated;
  writeEvidence(records, filePath);
  return updated;
}

export function linkEvidenceToAsset(evidenceId: string, assetId: string, filePath = DEFAULT_EVIDENCE_PATH): Evidence {
  const records = loadEvidence(filePath);
  const idx = records.findIndex((r) => r.evidence_id === evidenceId || r.id === evidenceId);
  if (idx < 0) throw new Error(`Evidence not found: ${evidenceId}`);
  if (!records[idx].linked_assets.includes(assetId)) {
    records[idx].linked_assets.push(assetId);
  }
  // If accepted, keep accepted; linking doesn't change status
  writeEvidence(records, filePath);
  return records[idx];
}

export function markConvertedToProposal(evidenceId: string, proposalId: string, filePath = DEFAULT_EVIDENCE_PATH): Evidence {
  const records = loadEvidence(filePath);
  const idx = records.findIndex((r) => r.evidence_id === evidenceId || r.id === evidenceId);
  if (idx < 0) throw new Error(`Evidence not found: ${evidenceId}`);
  const rec = records[idx];
  if (rec.review_status !== "accepted") throw new Error(`Evidence ${evidenceId} must be accepted before conversion`);
  const updated: Evidence = {
    ...rec,
    review_status: "converted_to_proposal",
    linked_assets: rec.linked_assets.includes(proposalId) ? rec.linked_assets : [...rec.linked_assets, proposalId],
  };
  records[idx] = updated;
  writeEvidence(records, filePath);
  return updated;
}

// Promote feedback to evidence (F6)
export function promoteFeedbackToEvidence(
  feedback: { id: string; summary: string; relatedAssetId: number; relatedDomain?: string; sourceSystem?: string; submittedBy?: string },
  workspaceId: string,
  filePath = DEFAULT_EVIDENCE_PATH,
): Evidence {
  const now = new Date().toISOString();
  const records = loadEvidence(filePath);
  const shortId = `evd_${now.slice(0, 10).replace(/-/g, "_")}_${String(records.length + 1).padStart(3, "0")}`;
  const evidence: Evidence = {
    evidence_id: shortId,
    id: shortId,
    workspace: workspaceId,
    source: "tool_usage_log" as any,
    observer: feedback.submittedBy ?? "system",
    observed_at: now,
    related_domain: feedback.relatedDomain ?? "operations",
    related_asset_id: String(feedback.relatedAssetId),
    confidence: 0.7,
    raw_payload: {
      summary: feedback.summary,
      details: `promoted from feedback ${feedback.id}`,
    },
    provenance: {
      origin_system: feedback.sourceSystem ?? "casio-operator",
      capture_method: "form_submission",
      capture_context: `promote_feedback_${feedback.id}`,
    },
    privacy_classification: "internal",
    review_status: "unreviewed",
    linked_assets: [],
    receivedAt: now,
    qualityStatus: "validated",
    fingerprint: `promote_${feedback.id}`,
    promoted_from_feedback: feedback.id,
  };
  records.push(evidence);
  writeEvidence(records, filePath);
  return evidence;
}
