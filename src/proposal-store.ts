import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FeedbackRecord } from "./intake-store.js";
import type { Playbook } from "./types.js";

const moduleDir = path.dirname(new URL(import.meta.url).pathname);
export const DEFAULT_PROPOSAL_PATH = path.resolve(moduleDir, "../data/version-proposals.json");

export type VersionProposal = {
  id: string;
  createdAt: string;
  status: "pending_human_merge" | "merged" | "discarded";
  feedbackId: string;
  relatedAssetId: number;
  relatedAssetName: string;
  baseKnowledgeVersion: string;
  createdBy: string;
  rationale: string;
  suggestedTargets: string[];
  candidatePatch: {
    source_feedback_id: string;
    source_system: string;
    source_type: string;
    observation: string;
    occurred_at: string | null;
    proposed_review_note: string;
  };
};

function ensureStore(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]\n", "utf8");
}

function readProposals(filePath: string): VersionProposal[] {
  ensureStore(filePath);
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Proposal store must contain a JSON array: ${filePath}`);
  return parsed as VersionProposal[];
}

function writeProposals(proposals: VersionProposal[], filePath: string): void {
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(proposals, null, 2)}\n`, "utf8");
  fs.renameSync(temp, filePath);
}

function targetsFor(sourceType: string): string[] {
  const normalized = sourceType.toLowerCase();
  if (normalized.includes("coaching")) return ["مثال_اجرایی", "مدل_داده", "مسیر_بازگشت_داده"];
  if (normalized.includes("metric") || normalized.includes("score")) return ["مدل_داده", "خروجی_های_کلیدی"];
  if (normalized.includes("content")) return ["مثال_اجرایی", "خروجی_های_کلیدی"];
  return ["مثال_اجرایی", "مسیر_بازگشت_داده"];
}

export function createVersionProposal(
  feedback: FeedbackRecord,
  playbook: Playbook,
  knowledgeVersion: string,
  reviewer: string,
  reviewNote: string,
  filePath = DEFAULT_PROPOSAL_PATH,
): VersionProposal {
  const proposals = readProposals(filePath);
  const proposal: VersionProposal = {
    id: `vp_${randomUUID()}`,
    createdAt: new Date().toISOString(),
    status: "pending_human_merge",
    feedbackId: feedback.id,
    relatedAssetId: playbook.id,
    relatedAssetName: playbook.نام_پلی_بوک,
    baseKnowledgeVersion: knowledgeVersion,
    createdBy: reviewer,
    rationale: `بازخورد تأییدشده از ${feedback.sourceSystem}/${feedback.sourceType} برای بازنگری انسانی پلی‌بوک.`,
    suggestedTargets: targetsFor(feedback.sourceType),
    candidatePatch: {
      source_feedback_id: feedback.id,
      source_system: feedback.sourceSystem,
      source_type: feedback.sourceType,
      observation: feedback.summary,
      occurred_at: feedback.occurredAt ?? null,
      proposed_review_note: reviewNote,
    },
  };
  proposals.push(proposal);
  writeProposals(proposals, filePath);
  return proposal;
}

export function listVersionProposals(
  status?: VersionProposal["status"],
  limit = 50,
  filePath = DEFAULT_PROPOSAL_PATH,
): VersionProposal[] {
  return readProposals(filePath)
    .filter((proposal) => !status || proposal.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.min(Math.max(limit, 1), 200));
}
