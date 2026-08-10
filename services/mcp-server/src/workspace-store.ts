// Workspace Store — workspace-aware paths (post-migration, no legacy fallback)
// Per Phase 0 step 5 & 6: all stores resolved from workspaces/{id}/... ; legacy paths removed.

import path from "node:path";
import type { Workspace } from "../../../src/workspace.js";

export function knowledgePathFor(ws: Workspace): string {
  return ws.knowledgePathAbs;
}

export function intakePathFor(ws: Workspace): string {
  return path.join(ws.dir, "feedback", "intake.json");
}

export function evidencePathFor(ws: Workspace): string {
  return path.join(ws.dir, "evidence", "evidence.json");
}

export function proposalsPathFor(ws: Workspace): string {
  return path.join(ws.dir, "registries", "version-proposals.json");
}

export function auditPathFor(ws: Workspace): string {
  return path.join(ws.dir, "registries", "audit-events.json");
}

// Runtime data mirrors (gitignored) — for tools that still use dataDir
export function intakeRuntimePathFor(ws: Workspace): string {
  return path.join(ws.dataDirAbs, "feedback-intake.json");
}
export function evidenceRuntimePathFor(ws: Workspace): string {
  return path.join(ws.dataDirAbs, "evidence.json");
}
