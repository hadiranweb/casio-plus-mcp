import { createHash } from "node:crypto";
import { z } from "zod";
import type { CasioKnowledge } from "./types.js";

export const feedbackInputSchema = z.object({
  sourceSystem: z.string().trim().min(2).max(100),
  sourceType: z.string().trim().min(2).max(100),
  submittedBy: z.string().trim().min(2).max(160),
  relatedAssetId: z.number().int().positive(),
  summary: z.string().trim().min(20).max(5000),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  payload: z.record(z.unknown()).default({}),
});

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
export type QualityStatus = "raw" | "quarantined" | "validated" | "rejected";
export type QualityIssue = {
  field: string;
  rule: string;
  message: string;
};
export type QualityReport = {
  valid: boolean;
  qualityStatus: QualityStatus;
  fingerprint: string;
  errors: QualityIssue[];
  warnings: QualityIssue[];
  checkedAt: string;
};

const knownSourceSystems = new Set([
  "casio-operator",
  "coaching-session",
  "casio-metric",
  "bale-channel",
  "crm",
  "manual",
  "import",
]);

function fingerprintOf(input: FeedbackInput): string {
  const stable = JSON.stringify({
    sourceSystem: input.sourceSystem.trim().toLocaleLowerCase("en-US"),
    sourceType: input.sourceType.trim().toLocaleLowerCase("en-US"),
    relatedAssetId: input.relatedAssetId,
    summary: input.summary.trim().replace(/\s+/g, " ").toLocaleLowerCase("fa-IR"),
    payload: input.payload,
  });
  return createHash("sha256").update(stable).digest("hex");
}

export function validateFeedback(input: FeedbackInput, knowledge: CasioKnowledge): QualityReport {
  const errors: QualityIssue[] = [];
  const warnings: QualityIssue[] = [];
  const playbook = knowledge.دارایی_ها.پلی_بوک_ها.find((item) => item.id === input.relatedAssetId);

  if (!playbook) {
    errors.push({
      field: "relatedAssetId",
      rule: "reference_exists",
      message: `پلی‌بوک با شناسهٔ ${input.relatedAssetId} در مدل کاسیو وجود ندارد.`,
    });
  }

  if (!knownSourceSystems.has(input.sourceSystem)) {
    warnings.push({
      field: "sourceSystem",
      rule: "known_source",
      message: `منبع «${input.sourceSystem}» در فهرست منابع استاندارد نیست؛ نیاز به بررسی انسانی دارد.`,
    });
  }

  if (!input.occurredAt) {
    warnings.push({
      field: "occurredAt",
      rule: "provenance_time",
      message: "زمان رخداد ثبت نشده است؛ زمان ثبت به‌عنوان زمان پیش‌فرض نگهداری می‌شود.",
    });
  }

  if (input.summary.trim().length < 40) {
    warnings.push({
      field: "summary",
      rule: "sufficient_context",
      message: "خلاصه کوتاه است؛ برای تبدیل به دانش قابل استفاده، زمینه و مشاهدهٔ قابل سنجش اضافه کنید.",
    });
  }

  return {
    valid: errors.length === 0,
    qualityStatus: errors.length === 0 ? "validated" : "quarantined",
    fingerprint: fingerprintOf(input),
    errors,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}
