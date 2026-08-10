import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { loadWorkspace, workspaceDir, workspacesDataRoot, writeWorkspaceManifest } from "../../../../src/workspace.js";
import { recordAuditEvent } from "../../../../src/audit-store.js";

// Step 06 — enable-workflows: feedback_intake + review_queue active
// These are Level 1 tools — only "ready" in this step, not executed

export function step06EnableWorkflows(workspaceId: string, installerId?: string): { status: string } {
  const ws = loadWorkspace(workspaceId);
  if (!ws.manifest) throw new Error(`manifest_not_found:${workspaceId}`);

  // Update bootstrap status: feedback_intake and review_queue become active
  const updated = { ...ws.manifest };
  if (updated.bootstrap) {
    updated.bootstrap = {
      ...updated.bootstrap,
      feedback_intake: "active" as const,
      review_queue: "active" as const,
      knowledge_map: "empty_graph" as const,
      playbooks: "templates_only" as const,
      data_registers: "schema_only" as const,
      workflows: "needs_field_discovery" as const,
    };
  }
  // Keep status still bootstrapped_empty or field_discovery? Not yet final
  writeWorkspaceManifest(workspaceId, updated);

  // Also ensure feedback dir has .gitkeep
  const feedbackDir = path.join(workspaceDir(workspaceId), "feedback");
  fs.mkdirSync(feedbackDir, { recursive: true });

  try {
    const dataRoot = workspacesDataRoot();
    const auditPath = path.join(dataRoot, workspaceId, "audit-events.json");
    recordAuditEvent(
      { action: "bootstrap_step_06_enable_workflows", actor: installerId ?? "system_igniter", entityType: "workspace", entityId: workspaceId, details: { step: 6, feedback_intake: "active", review_queue: "active" } },
      auditPath,
    );
  } catch {}

  return { status: updated.status };
}
