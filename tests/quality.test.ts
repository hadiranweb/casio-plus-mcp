import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadKnowledge } from "../services/mcp-server/src/knowledge-store.js";
import { listFeedbackQueue, submitFeedback } from "../services/mcp-server/src/intake-store.js";
import { validateFeedback, type FeedbackInput } from "../services/mcp-server/src/quality.js";

const knowledge = loadKnowledge();
const tempDirs: string[] = [];

function queuePath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "casio-mcp-test-"));
  tempDirs.push(dir);
  return path.join(dir, "feedback.json");
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function validInput(): FeedbackInput {
  return {
    sourceSystem: "coaching-session",
    sourceType: "observation",
    submittedBy: "coach-01",
    relatedAssetId: 56,
    summary: "دانش‌پذیر در تشخیص گلوگاه فروش مشکل داشت و به مثال عملی بیشتری در فرم جلسه کوچینگ نیاز دارد.",
    occurredAt: "2026-08-08T12:00:00.000Z",
    payload: { readinessScore: 6 },
  };
}

describe("Data Quality Gate", () => {
  it("validates feedback linked to a real playbook", () => {
    const report = validateFeedback(validInput(), knowledge);
    expect(report.valid).toBe(true);
    expect(report.qualityStatus).toBe("validated");
    expect(report.errors).toHaveLength(0);
  });

  it("quarantines feedback linked to a missing asset", () => {
    const input = { ...validInput(), relatedAssetId: 9999 };
    const report = validateFeedback(input, knowledge);
    expect(report.valid).toBe(false);
    expect(report.qualityStatus).toBe("quarantined");
    expect(report.errors[0]?.field).toBe("relatedAssetId");
  });

  it("stores validated feedback in a local review queue", () => {
    const input = validInput();
    const report = validateFeedback(input, knowledge);
    const result = submitFeedback(input, report, queuePath());
    expect(result.record.id).toMatch(/^fbk_/);
    expect(result.record.reviewStatus).toBe("pending_review");
    expect(result.record.qualityStatus).toBe("validated");
  });

  it("treats automation-runtime as a known source without warning", () => {
    const report = validateFeedback({ ...validInput(), sourceSystem: "automation-runtime" }, knowledge);
    expect(report.valid).toBe(true);
    expect(report.warnings.some((warning) => warning.rule === "known_source")).toBe(false);
  });

  it("flags a near-duplicate summary with a fuzzy_duplicate warning without blocking it", () => {
    const filePath = queuePath();
    const input = validInput();
    const report = validateFeedback(input, knowledge);
    const first = submitFeedback(input, report, filePath);
    const near = { ...validInput(), summary: validInput().summary.replace("مشکل داشت", "مشکلی داشت") };
    const second = submitFeedback(near, validateFeedback(near, knowledge), filePath);
    expect(second.duplicateOf).toBeUndefined();
    expect(second.fuzzyDuplicateOf).toBe(first.record.id);
    expect(second.record.qualityStatus).toBe("validated");
    expect(second.record.qualityReport.warnings.some((warning) => warning.rule === "fuzzy_duplicate")).toBe(true);
  });

  it("quarantines duplicate feedback instead of silently accepting it", () => {
    const filePath = queuePath();
    const input = validInput();
    const report = validateFeedback(input, knowledge);
    const first = submitFeedback(input, report, filePath);
    const second = submitFeedback(input, report, filePath);
    expect(second.duplicateOf).toBe(first.record.id);
    expect(second.record.qualityStatus).toBe("quarantined");
    expect(second.record.qualityReport.errors.some((error) => error.rule === "duplicate")).toBe(true);
    expect(listFeedbackQueue({}, filePath)).toHaveLength(2);
  });
});
