import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FeedbackInput, QualityReport, QualityStatus } from "./quality.js";

export type FeedbackRecord = FeedbackInput & {
  id: string;
  receivedAt: string;
  qualityStatus: QualityStatus;
  qualityReport: QualityReport;
  reviewStatus: "pending_review" | "approved" | "rejected";
};

const moduleDir = path.dirname(new URL(import.meta.url).pathname);
export const DEFAULT_INTAKE_PATH = path.resolve(moduleDir, "../data/feedback-intake.json");

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
};

export function submitFeedback(
  input: FeedbackInput,
  qualityReport: QualityReport,
  filePath = DEFAULT_INTAKE_PATH,
): SubmitResult {
  const records = loadFeedbackQueue(filePath);
  const duplicate = records.find(
    (record) => record.qualityReport.fingerprint === qualityReport.fingerprint && record.reviewStatus !== "rejected",
  );

  const record: FeedbackRecord = {
    ...input,
    id: `fbk_${randomUUID()}`,
    receivedAt: new Date().toISOString(),
    qualityStatus: duplicate ? "quarantined" : qualityReport.qualityStatus,
    qualityReport: duplicate
      ? {
          ...qualityReport,
          valid: false,
          qualityStatus: "quarantined",
          errors: [
            ...qualityReport.errors,
            {
              field: "fingerprint",
              rule: "duplicate",
              message: `رکورد مشابه قبلاً با شناسهٔ ${duplicate.id} ثبت شده است.`,
            },
          ],
        }
      : qualityReport,
    reviewStatus: "pending_review",
  };

  records.push(record);
  writeFeedbackQueue(records, filePath);
  return { record, duplicateOf: duplicate?.id };
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
