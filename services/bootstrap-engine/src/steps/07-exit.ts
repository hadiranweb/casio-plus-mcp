import fs from "node:fs";
import path from "node:path";
import { loadWorkspace, workspaceDir, workspacesDataRoot, writeWorkspaceManifest } from "../../../../src/workspace.js";
import { assertTransition } from "../state-machine.js";
import { recordAuditEvent } from "../../../../src/audit-store.js";

// Step 07 — exit: final manifest + bootstrap_run_id report

export function step07Exit(workspaceId: string, installerId?: string): { bootstrap_run_id: string; status: string } {
  const ws = loadWorkspace(workspaceId);
  if (!ws.manifest) throw new Error(`manifest_not_found:${workspaceId}`);

  const from = ws.manifest.status;
  const to = "field_discovery";
  // Guard: only allowed transition bootstrapped_empty → field_discovery
  assertTransition(from, to);

  // Generate bootstrap_run_id if not exists
  const runId = ws.manifest.bootstrap_run_id ?? `bootstrap_${new Date().toISOString().slice(0, 10).replace(/-/g, "_")}_${Date.now().toString().slice(-6)}`;
  const updated = {
    ...ws.manifest,
    status: "field_discovery" as const,
    bootstrap_run_id: runId,
  };
  writeWorkspaceManifest(workspaceId, updated);

  // Human-readable report
  const reportPath = path.join(workspaceDir(workspaceId), "bootstrap-report.json");
  const report = {
    workspace_id: workspaceId,
    bootstrap_run_id: runId,
    status: "field_discovery",
    installer_id: installerId ?? ws.manifest.installer_id ?? "system_igniter",
    generated_at: new Date().toISOString(),
    lineage: {
      kernel_version: updated.created_from_kernel_version,
      spec_version: updated.created_from_specification_version,
      bootstrap_protocol: updated.bootstrap_protocol_version,
    },
    next_steps: ["capture_field_observation", "evidence → review → proposal"],
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  try {
    const dataRoot = workspacesDataRoot();
    const auditPath = path.join(dataRoot, workspaceId, "audit-events.json");
    recordAuditEvent(
      { action: "bootstrap_step_07_exit", actor: installerId ?? "system_igniter", entityType: "workspace", entityId: workspaceId, details: { step: 7, bootstrap_run_id: runId, status: "field_discovery" } },
      auditPath,
    );
  } catch {}

  return { bootstrap_run_id: runId, status: "field_discovery" };
}
