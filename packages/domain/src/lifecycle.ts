import { DomainError } from "./errors.js";

export type Lifecycle =
  | "problem"
  | "process"
  | "island"
  | "run"
  | "evidence"
  | "feedback"
  | "knowledge"
  | "versionProposal"
  | "asset";
const transitions: Record<Lifecycle, Record<string, readonly string[]>> = {
  problem: {
    raw: ["exploring", "archived"],
    exploring: ["structured", "archived"],
    structured: ["resolved", "archived"],
    resolved: ["archived"],
    archived: [],
  },
  process: {
    draft: ["review"],
    review: ["validated"],
    validated: ["published", "deprecated"],
    published: ["deprecated"],
    deprecated: ["archived"],
    archived: [],
  },
  island: {
    draft: ["validating"],
    validating: ["active"],
    active: ["suspended", "deprecated"],
    suspended: ["active", "deprecated"],
    deprecated: ["archived"],
    archived: [],
  },
  run: {
    created: ["authorizing", "cancelled"],
    authorizing: ["queued", "waiting_for_approval", "cancelled"],
    queued: ["running", "failed", "cancelled"],
    running: ["waiting_for_approval", "evaluating", "failed", "cancelled"],
    waiting_for_approval: ["queued", "running", "cancelled"],
    evaluating: ["completed", "failed"],
    completed: [],
    failed: [],
    cancelled: [],
  },
  evidence: {
    raw: ["validated", "quarantined", "rejected"],
    quarantined: ["validated", "rejected"],
    validated: ["superseded"],
    rejected: [],
    superseded: [],
  },
  feedback: {
    raw: ["validated", "rejected"],
    validated: ["promoted"],
    rejected: [],
    promoted: [],
  },
  knowledge: {
    proposed: ["review"],
    review: ["published"],
    published: ["superseded", "archived"],
    superseded: ["archived"],
    archived: [],
  },
  versionProposal: {
    draft: ["pending_review"],
    pending_review: ["approved", "rejected"],
    approved: ["merged"],
    rejected: [],
    merged: [],
  },
  asset: {
    draft: ["review"],
    review: ["published"],
    published: ["deprecated", "withdrawn"],
    deprecated: ["withdrawn"],
    withdrawn: [],
  },
};
export function transition(
  lifecycle: Lifecycle,
  from: string,
  to: string,
): string {
  if (!transitions[lifecycle][from]?.includes(to))
    throw new DomainError(`invalid_${lifecycle}_transition:${from}->${to}`);
  return to;
}
export function isTerminal(lifecycle: Lifecycle, state: string): boolean {
  return transitions[lifecycle][state]?.length === 0;
}
