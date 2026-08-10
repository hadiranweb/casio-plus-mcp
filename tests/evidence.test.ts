import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bootstrapWorkspace } from "../src/workspace.js";
import { captureFieldObservation, listEvidence, reviewEvidence } from "../src/evidence-store.js";

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_WORKSPACES_DIR;
  delete process.env.CASIO_WORKSPACES_DATA_DIR;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-evidence-"));
  dirs.push(d);
  process.env.CASIO_WORKSPACES_DIR = d;
  process.env.CASIO_WORKSPACES_DATA_DIR = path.join(d, "data");
  bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
  return d;
}

describe("evidence primitive — the most important primitive", () => {
  it("captures field observation with provenance and review_status unreviewed", () => {
    const d = setup();
    const evidencePath = path.join(d, "data", "acme", "evidence.json");
    const result = captureFieldObservation(
      {
        related_domain: "sales",
        summary: "مشتری X در جلسه کوچینگ به مشکل Y برخورد و نیاز به پیگیری بیشتر دارد — این یک مشاهده طولانی است.",
        details: "جزئیات بیشتر درباره جلسه",
        observer: "process_coach_001",
        source: "coaching_session",
        confidence: 0.8,
        provenance_capture_context: "coaching_session_042",
      },
      "acme",
      evidencePath,
    );
    expect(result.evidence.evidence_id).toMatch(/^evd_/);
    expect(result.evidence.review_status).toBe("unreviewed");
    expect(result.evidence.related_domain).toBe("sales");
    expect(result.evidence.provenance.capture_context).toBe("coaching_session_042");
    expect(result.evidence.provenance.origin_system).toBe("manual");
    expect(result.duplicateOf).toBeUndefined();
  });

  it("quarantines exact duplicate evidence", () => {
    const d = setup();
    const evidencePath = path.join(d, "data", "acme", "evidence.json");
    const input = {
      related_domain: "education",
      summary: "دانش‌پذیر در تشخیص گلوگاه فروش مشکل داشت و به مثال عملی بیشتری در فرم جلسه کوچینگ نیاز دارد.",
    };
    const first = captureFieldObservation(input, "acme", evidencePath);
    const second = captureFieldObservation(input, "acme", evidencePath);
    expect(second.duplicateOf).toBe(first.evidence.evidence_id);
    expect(second.evidence.qualityStatus).toBe("quarantined");
  });

  it("reviews evidence to accepted and counts toward workspace readiness", async () => {
    const d = setup();
    const { evidenceCount, workspaceReadiness } = await import("../src/workspace.js");
    const { loadWorkspace } = await import("../src/workspace.js");
    const evidencePath = path.join(d, "data", "acme", "evidence.json");
    // capture 3 evidences and accept them
    for (let i = 0; i < 3; i++) {
      const res = captureFieldObservation(
        {
          related_domain: "sales",
          summary: `مشاهده واقعی میدان شماره ${i + 1}: گلوگاه در پیگیری مشتری و نیاز به مثال عملی بیشتر در فرم جلسه کوچینگ — این یک مشاهده طولانی برای تست است.`,
        },
        "acme",
        evidencePath,
      );
      reviewEvidence(res.evidence.evidence_id, "accepted", "reviewer", "شواهد واقعی است.", evidencePath);
    }
    const ws = loadWorkspace("acme", d);
    expect(evidenceCount(ws)).toBe(3);
    expect(workspaceReadiness(ws)).toBe("forming");
  });

  it("lists evidence with filters", () => {
    const d = setup();
    const evidencePath = path.join(d, "data", "acme", "evidence.json");
    captureFieldObservation(
      { related_domain: "sales", summary: "مشاهده فروش اول که به اندازه کافی طولانی است برای اینکه ذخیره شود و بررسی گردد." },
      "acme",
      evidencePath,
    );
    captureFieldObservation(
      { related_domain: "education", summary: "مشاهده آموزش اول که به اندازه کافی طولانی است برای اینکه ذخیره شود و بررسی گردد." },
      "acme",
      evidencePath,
    );
    expect(listEvidence({ related_domain: "sales" }, evidencePath)).toHaveLength(1);
    expect(listEvidence({ limit: 1 }, evidencePath)).toHaveLength(1);
    expect(listEvidence({}, evidencePath)).toHaveLength(2);
  });
});
