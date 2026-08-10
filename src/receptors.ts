import { getPlaybook, loadKnowledge, searchPlaybooks } from "./knowledge-store.js";
import type { Playbook } from "./types.js";
import type { FeedbackInput, QualityReport } from "./quality.js";
import { validateFeedback } from "./quality.js";
import { listFeedbackQueue, reviewFeedback, submitFeedback } from "./intake-store.js";
import { listAuditEvents, recordAuditEvent } from "./audit-store.js";
import { listVersionProposals } from "./proposal-store.js";
import type { Workspace } from "./workspace.js";
import path from "node:path";
import { captureFieldObservation, listEvidence, reviewEvidence } from "./evidence-store.js";
import type { CaptureEvidenceInput } from "./evidence-store.js";

/**
 * Receptors — the shared contracts between every island (workspace) and the
 * Synaptic Hub (MCP server), the "USB" of the organism.
 *
 * `workspaceReceptors(ws)` binds the core receptors to one workspace's
 * own knowledge and runtime stores, so the same generic hub serves every
 * brand: route → island → receptor → audit.
 */

export interface KnowledgeReceptor {
  readonly kind: "knowledge";
  load(): unknown;
  search(query: string | undefined, filters?: Record<string, unknown>): Playbook[];
  getPlaybook(id: number): Playbook | undefined;
  validate(input: FeedbackInput): QualityReport;
}

export interface FeedbackReceptor {
  readonly kind: "feedback";
  submit(input: FeedbackInput, report: QualityReport): { record: unknown; duplicateOf?: string; fuzzyDuplicateOf?: string };
  listQueue(filters?: Record<string, unknown>): unknown[];
  review(id: string, decision: "approved" | "rejected", by: string, note: string): unknown;
}

export interface EvidenceReceptor {
  readonly kind: "evidence";
  capture(input: CaptureEvidenceInput): { evidence: unknown; duplicateOf?: string; fuzzyDuplicateOf?: string };
  list(filters?: Record<string, unknown>): unknown[];
  review(id: string, decision: "accepted" | "rejected" | "triaged", by: string, note: string): unknown;
}

export interface AuditReceptor {
  readonly kind: "audit";
  record(event: Omit<Record<string, unknown>, "id" | "occurredAt">): unknown;
  list(limit?: number): unknown[];
  listProposals(status?: string, limit?: number): unknown[];
}

export type WorkspaceReceptors = {
  knowledge: KnowledgeReceptor;
  feedback: FeedbackReceptor;
  evidence: EvidenceReceptor;
  audit: AuditReceptor;
};

function wsStorePaths(ws: Workspace) {
  return {
    intake: path.join(ws.dataDirAbs, "feedback-intake.json"),
    evidence: path.join(ws.dataDirAbs, "evidence.json"),
    audit: path.join(ws.dataDirAbs, "audit-events.json"),
    proposals: path.join(ws.dataDirAbs, "version-proposals.json"),
  };
}

/** Bind the core receptors to one workspace. */
export function workspaceReceptors(ws: Workspace): WorkspaceReceptors {
  const paths = wsStorePaths(ws);
  const knowledge = loadKnowledge(ws.knowledgePathAbs);

  const knowledgeReceptor: KnowledgeReceptor = {
    kind: "knowledge",
    load: () => knowledge,
    search: (query, filters = {}) => searchPlaybooks(knowledge, { query, ...filters }),
    getPlaybook: (id) => getPlaybook(knowledge, id),
    validate: (input) => validateFeedback(input, knowledge),
  };

  const feedbackReceptor: FeedbackReceptor = {
    kind: "feedback",
    submit: (input, report) => submitFeedback(input, report, paths.intake),
    listQueue: (filters = {}) => listFeedbackQueue(filters as never, paths.intake),
    review: (id, decision, by, note) => reviewFeedback(id, decision, by, note, paths.intake),
  };

  const evidenceReceptor: EvidenceReceptor = {
    kind: "evidence",
    capture: (input) => captureFieldObservation(input, ws.config.id, paths.evidence),
    list: (filters = {}) => listEvidence(filters as never, paths.evidence),
    review: (id, decision, by, note) => reviewEvidence(id, decision, by, note, paths.evidence),
  };

  const auditReceptor: AuditReceptor = {
    kind: "audit",
    record: (event) =>
      recordAuditEvent(event as never, paths.audit),
    list: (limit = 50) => listAuditEvents(limit, paths.audit),
    listProposals: (status, limit = 50) => listVersionProposals(status as never, limit, paths.proposals),
  };

  return { knowledge: knowledgeReceptor, feedback: feedbackReceptor, evidence: evidenceReceptor, audit: auditReceptor };
}
