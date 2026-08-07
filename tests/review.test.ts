import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { recordAuditEvent, listAuditEvents } from "../src/audit-store.js";
import { attachProposalToFeedback, reviewFeedback, submitFeedback } from "../src/intake-store.js";
import { getPlaybook, loadKnowledge } from "../src/knowledge-store.js";
import { createVersionProposal, listVersionProposals } from "../src/proposal-store.js";
import { validateFeedback, type FeedbackInput } from "../src/quality.js";

const knowledge = loadKnowledge();
const temporaryDirs: string[] = [];

function paths() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "casio-mcp-review-"));
  temporaryDirs.push(directory);
  return {
    intake: path.join(directory, "intake.json"),
    audit: path.join(directory, "audit.json"),
    proposals: path.join(directory, "proposals.json"),
  };
}

afterEach(() => {
  for (const directory of temporaryDirs.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

const input: FeedbackInput = {
  sourceSystem: "coaching-session",
  sourceType: "coaching_note",
  submittedBy: "coach-02",
  relatedAssetId: 56,
  summary: "فرم کوچینگ باید بخش روشن‌تری برای معیار موفقیت و بازخورد پشتیبانی داشته باشد تا پیگیری جلسه بعد قابل سنجش شود.",
  occurredAt: "2026-08-08T12:00:00.000Z",
  payload: { readinessScore: 7 },
};

describe("Review, audit and version proposal", () => {
  it("approves validated feedback and creates a proposal without changing knowledge", () => {
    const file = paths();
    const report = validateFeedback(input, knowledge);
    const submitted = submitFeedback(input, report, file.intake).record;
    const reviewed = reviewFeedback(submitted.id, "approved", "knowledge-manager", "بازخورد قابل تبدیل به پیشنهاد نسخه‌ای است.", file.intake);
    const asset = getPlaybook(knowledge, reviewed.relatedAssetId);
    expect(asset).toBeDefined();

    const proposal = createVersionProposal(reviewed, asset!, knowledge.meta.نسخه, "knowledge-manager", "بازخورد قابل تبدیل به پیشنهاد نسخه‌ای است.", file.proposals);
    const linked = attachProposalToFeedback(reviewed.id, proposal.id, file.intake);
    const audit = recordAuditEvent({
      action: "version_proposal_created",
      actor: "knowledge-manager",
      entityType: "version_proposal",
      entityId: proposal.id,
      details: { feedbackId: reviewed.id },
    }, file.audit);

    expect(linked.reviewStatus).toBe("approved");
    expect(linked.proposalId).toBe(proposal.id);
    expect(proposal.status).toBe("pending_human_merge");
    expect(proposal.baseKnowledgeVersion).toBe(knowledge.meta.نسخه);
    expect(proposal.suggestedTargets).toContain("مدل_داده");
    expect(listVersionProposals(undefined, 50, file.proposals)).toHaveLength(1);
    expect(listAuditEvents(50, file.audit)[0]?.id).toBe(audit.id);
    expect(getPlaybook(knowledge, 56)?.نام_پلی_بوک).toContain("فرم ثبت جلسه");
  });

  it("does not approve quarantined feedback", () => {
    const file = paths();
    const invalid = { ...input, relatedAssetId: 9999 };
    const report = validateFeedback(invalid, knowledge);
    const submitted = submitFeedback(invalid, report, file.intake).record;
    expect(() => reviewFeedback(submitted.id, "approved", "knowledge-manager", "تلاش برای تایید داده نامعتبر.", file.intake)).toThrow("Only validated feedback");
  });

  it("allows rejection of quarantined feedback", () => {
    const file = paths();
    const invalid = { ...input, relatedAssetId: 9999 };
    const report = validateFeedback(invalid, knowledge);
    const submitted = submitFeedback(invalid, report, file.intake).record;
    const reviewed = reviewFeedback(submitted.id, "rejected", "knowledge-manager", "مرجع پلی‌بوک وجود ندارد.", file.intake);
    expect(reviewed.reviewStatus).toBe("rejected");
  });
});
