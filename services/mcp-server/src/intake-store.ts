import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { normalizedSimilarity } from "./text-similarity.js";
import type { FeedbackInput, QualityReport, QualityStatus } from "./quality.js";

export type FeedbackRecord = FeedbackInput & {
  id: string;
  receivedAt: string;
  qualityStatus: QualityStatus;
  qualityReport: QualityReport;
  reviewStatus: "pending_review" | "approved" | "rejected";
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  proposalId?: string;
};

const moduleDir = path.dirname(new URL(import.meta.url).pathname);
export const DEFAULT_INTAKE_PATH = path.resolve(moduleDir, "../../../data/feedback-intake.json");

function ensureStore(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]\n", "utf8");
  }
}

export function loadFeedbackQueue(filePath = DEFAULT_INTAKE_PATH): FeedbackRecord[] {
  ensureStore(filePath);
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Feedback intake store must contain a JSON array: ${filePath}`);
  }
  return parsed as FeedbackRecord[];
}

function writeFeedbackQueue(records: FeedbackRecord[], filePath: string): void {
  ensureStore(filePath);
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

export type SubmitResult = {
  record: FeedbackRecord;
  duplicateOf?: string;
  /** A near-duplicate (fuzzy match) that was flagged as a warning, not blocked. */
  fuzzyDuplicateOf?: string;
};

// Very-close-but-not-identical summaries within the same playbook read as the
// same field observation typed differently ("HADI@Example.COM" vs "hadi@example.com"
// of the same note). Exact fingerprints stay the hard dedup; this is a warning.
const FUZZY_SIMILARITY_THRESHOLD = 0.92;
const FUZZY_MIN_LENGTH = 40;
const FUZZY_MAX_LENGTH = 600;

function findFuzzyDuplicate(records: FeedbackRecord[], input: FeedbackInput): FeedbackRecord | undefined {
  const candidates = records
    .filter((record) => record.reviewStatus !== "rejected")
    .filter((record) => record.relatedAssetId === input.relatedAssetId)
    .slice(-100);
  for (const record of candidates) {
    const a = input.summary.trim();
    const b = record.summary.trim();
    if (a.length < FUZZY_MIN_LENGTH || b.length < FUZZY_MIN_LENGTH) continue;
    if (Math.max(a.length, b.length) > FUZZY_MAX_LENGTH) continue;
    if (normalizedSimilarity(a, b) >= FUZZY_SIMILARITY_THRESHOLD) return record;
  }
  return undefined;
}

export function submitFeedback(
  input: FeedbackInput,
  qualityReport: QualityReport,
  filePath = DEFAULT_INTAKE_PATH,
): SubmitResult {
  const records = loadFeedbackQueue(filePath);
  const duplicate = records.find(
    (record) => record.qualityReport.fingerprint === qualityReport.fingerprint && record.reviewStatus !== "rejected",
  );

  let report = qualityReport;
  let fuzzyDuplicateOf: string | undefined;
  if (!duplicate) {
    const fuzzy = findFuzzyDuplicate(records, input);
    if (fuzzy) {
      fuzzyDuplicateOf = fuzzy.id;
      report = {
        ...qualityReport,
        warnings: [
          ...qualityReport.warnings,
          {
            field: "summary",
            rule: "fuzzy_duplicate",
            message: `رکورد بسیار مشابه قبلاً با شناسهٔ ${fuzzy.id} ثبت شده است؛ بررسی کنید آیا همان مشاهده است.`,
          },
        ],
      };
    }
  }

  const record: FeedbackRecord = {
    ...input,
    id: `fbk_${randomUUID()}`,
    receivedAt: new Date().toISOString(),
    qualityStatus: duplicate ? "quarantined" : report.qualityStatus,
    qualityReport: duplicate
      ? {
          ...report,
          valid: false,
          qualityStatus: "quarantined",
          errors: [
            ...report.errors,
            {
              field: "fingerprint",
              rule: "duplicate",
              message: `رکورد مشابه قبلاً با شناسهٔ ${duplicate.id} ثبت شده است.`,
            },
          ],
        }
      : report,
    reviewStatus: "pending_review",
  };

  records.push(record);
  writeFeedbackQueue(records, filePath);
  return { record, duplicateOf: duplicate?.id, fuzzyDuplicateOf };
}

export type QueueFilters = {
  qualityStatus?: QualityStatus;
  reviewStatus?: FeedbackRecord["reviewStatus"];
  relatedAssetId?: number;
  limit?: number;
};

export function listFeedbackQueue(filters: QueueFilters = {}, filePath = DEFAULT_INTAKE_PATH): FeedbackRecord[] {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  return loadFeedbackQueue(filePath)
    .filter((record) => !filters.qualityStatus || record.qualityStatus === filters.qualityStatus)
    .filter((record) => !filters.reviewStatus || record.reviewStatus === filters.reviewStatus)
    .filter((record) => !filters.relatedAssetId || record.relatedAssetId === filters.relatedAssetId)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, limit);
}

export type ReviewDecision = "approved" | "rejected";

export function reviewFeedback(
  id: string,
  decision: ReviewDecision,
  reviewedBy: string,
  reviewNote: string,
  filePath = DEFAULT_INTAKE_PATH,
): FeedbackRecord {
  const records = loadFeedbackQueue(filePath);
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) throw new Error(`Feedback record not found: ${id}`);

  const record = records[index];
  if (record.reviewStatus !== "pending_review") {
    throw new Error(`Feedback record ${id} has already been reviewed (${record.reviewStatus}).`);
  }
  if (decision === "approved" && record.qualityStatus !== "validated") {
    throw new Error(`Only validated feedback can be approved. Record ${id} is ${record.qualityStatus}.`);
  }

  const reviewed: FeedbackRecord = {
    ...record,
    reviewStatus: decision,
    reviewedAt: new Date().toISOString(),
    reviewedBy,
    reviewNote,
  };
  records[index] = reviewed;
  writeFeedbackQueue(records, filePath);
  return reviewed;
}

export function attachProposalToFeedback(
  id: string,
  proposalId: string,
  filePath = DEFAULT_INTAKE_PATH,
): FeedbackRecord {
  const records = loadFeedbackQueue(filePath);
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) throw new Error(`Feedback record not found: ${id}`);
  records[index] = { ...records[index], proposalId };
  writeFeedbackQueue(records, filePath);
  return records[index];
}
