// State Machine — وضعیت‌های workspace + گذارهای مجاز
// Source: core/bootstrap/workspace-manifest.schema.yaml + docs/spec general_ecosystem workspace_bootstrap_engine

export type WorkspaceStatus =
  | "bootstrapped_empty"
  | "field_discovery"
  | "evidence_collecting"
  | "reviewing"
  | "operationalizing"
  | "automation_ready"
  | "archived";

// Legacy aliases for backwards compat with existing manifests
const LEGACY_MAP: Record<string, WorkspaceStatus> = {
  bootstrapped_empty: "bootstrapped_empty",
  field_discovery: "field_discovery",
  evidence_collecting: "evidence_collecting",
  forming: "evidence_collecting", // old forming → evidence_collecting
  mature: "operationalizing", // old mature → operationalizing
  archived: "archived",
  reviewing: "reviewing",
  operationalizing: "operationalizing",
  automation_ready: "automation_ready",
};

export function normalizeStatus(s: string): WorkspaceStatus {
  return (LEGACY_MAP[s] ?? s) as WorkspaceStatus;
}

const ALLOWED: Record<WorkspaceStatus, WorkspaceStatus[]> = {
  bootstrapped_empty: ["field_discovery", "archived"],
  field_discovery: ["evidence_collecting", "archived"],
  evidence_collecting: ["reviewing", "archived"],
  reviewing: ["operationalizing", "archived"],
  operationalizing: ["automation_ready", "archived"],
  automation_ready: ["archived"],
  archived: [],
};

export function canTransition(from: string, to: string): boolean {
  const f = normalizeStatus(from);
  const t = normalizeStatus(to) as WorkspaceStatus;
  return (ALLOWED[f] ?? []).includes(t);
}

export function assertTransition(from: string, to: string): void {
  if (!canTransition(from, to)) {
    throw new Error(`invalid_state_transition:${from}→${to}`);
  }
}

export const STATUS_VALUES = Object.keys(ALLOWED) as WorkspaceStatus[];

// Phase 1 constraint: automation_ready never reachable (Level 4 off)
export function isAutomationReadyBlocked(): boolean {
  return true; // per spec: automation_ready in this phase هرگز نباید قابل دستیابی باشد
}
