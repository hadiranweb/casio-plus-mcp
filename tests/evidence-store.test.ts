import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  captureEvidence,
  evidenceAcceptedCount,
  listEvidence,
  triageEvidence,
} from "../src/evidence-store.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setupWs(): { dataDirAbs: string } {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-evidence-"));
  dirs.push(d);
  return { dataDirAbs: d };
}

describe("evidence store (field evidence primitive)", () => {
  it("captures a field observation as unreviewed evidence", () => {
    const ws = setupWs();
    const record = captureEvidence(ws, {
      observer: "process_coach_001",
      summary: "مشتری X در جلسه کوچینگ به مشکل فروش برخورد کرد",
      related_domain: "education",
      confidence: 0.8,
    });
    expect(record.evidence_id).toMatch(/^evd_/);
    expect(record.review_status).toBe("unreviewed");
    expect(record.confidence).toBe(0.8);
    expect(record.provenance.origin_system).toBe("casio-operator");
    expect(record.privacy_classification).toBe("internal");
    expect(listEvidence(ws)).toHaveLength(1);
    expect(evidenceAcceptedCount(ws)).toBe(0);
  });

  it("rejects too-short summaries and empty observers", () => {
    const ws = setupWs();
    expect(() => captureEvidence(ws, { observer: "", summary: "x", related_domain: "sales" })).toThrow();
  });

  it("triages evidence and counts accepted as real evidence", () => {
    const ws = setupWs();
    const record = captureEvidence(ws, {
      observer: "coach",
      summary: "گلوگاه در پیگیری مشتری بود و نیاز به مثال عملی بیشتر در فرم جلسه است",
      related_domain: "sales",
    });
    const accepted = triageEvidence(ws, record.evidence_id, "accepted", "reviewer-1");
    expect(accepted.review_status).toBe("accepted");
    expect(evidenceAcceptedCount(ws)).toBe(1);
    expect(listEvidence(ws, { reviewStatus: "accepted" })).toHaveLength(1);
  });

  it("rejects double triage and missing evidence", () => {
    const ws = setupWs();
    const record = captureEvidence(ws, { observer: "coach", summary: "مشاهده معتبر میدان درباره فروش و پیگیری", related_domain: "sales" });
    triageEvidence(ws, record.evidence_id, "accepted", "r1");
    expect(() => triageEvidence(ws, record.evidence_id, "rejected", "r1")).toThrow("evidence_already_decided");
    expect(() => triageEvidence(ws, "evd_missing", "accepted", "r1")).toThrow("evidence_not_found");
  });

  it("filters by review status and domain", () => {
    const ws = setupWs();
    captureEvidence(ws, { observer: "a", summary: "مشاهده یک درباره فروش و پیگیری مشتری", related_domain: "sales" });
    const rec2 = captureEvidence(ws, { observer: "b", summary: "مشاهده دو درباره آموزش و روش تدریس", related_domain: "education" });
    triageEvidence(ws, rec2.evidence_id, "accepted", "r");
    expect(listEvidence(ws, { relatedDomain: "sales" })).toHaveLength(1);
    expect(listEvidence(ws, { reviewStatus: "accepted" })).toHaveLength(1);
  });
});
