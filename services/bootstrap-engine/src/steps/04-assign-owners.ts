import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { assignOwner, defineDomain, loadWorkspace, workspaceDir, workspacesDataRoot } from "../../../../src/workspace.js";
import { recordAuditEvent } from "../../../../src/audit-store.js";

// Step 04 — assign-owners: owner_assignments + validation
// Without owner, no asset reaches approved_v1 (constitution boundary_clarity)

export function step04AssignOwners(workspaceId: string, installerId?: string): { assigned: number } {
  const dir = workspaceDir(workspaceId);
  const answersPath = path.join(dir, "answers.yaml");
  if (!fs.existsSync(answersPath)) throw new Error(`answers_not_found:${workspaceId}`);
  const answers: any = parse(fs.readFileSync(answersPath, "utf8"));
  const owners: Record<string, string> = answers.owners ?? {};
  const domains: string[] = answers.domains ?? [];

  let assigned = 0;
  for (const d of domains) {
    const owner = owners[d];
    if (!owner) continue; // leave needs_assignment, no guessing (E4)
    // Ensure domain exists in manifest, create if missing (idempotent)
    try {
      defineDomain(workspaceId, { domain_id: d, domain_name: d });
    } catch (e: any) {
      if (!String(e.message).includes("domain_already_exists")) throw e;
    }
    assignOwner(workspaceId, d, owner);
    assigned++;
  }

  // Also handle explicit domains in manifest already — ensure owners
  const ws = loadWorkspace(workspaceId);
  for (const dom of ws.manifest?.domains ?? []) {
    if (dom.owner_id === "needs_assignment" && owners[dom.domain_id]) {
      assignOwner(workspaceId, dom.domain_id, owners[dom.domain_id]);
      assigned++;
    }
  }

  try {
    const dataRoot = workspacesDataRoot();
    const auditPath = path.join(dataRoot, workspaceId, "audit-events.json");
    recordAuditEvent(
      { action: "bootstrap_step_04_assign_owners", actor: installerId ?? "system_igniter", entityType: "workspace", entityId: workspaceId, details: { step: 4, assigned } },
      auditPath,
    );
  } catch {}

  return { assigned };
}
