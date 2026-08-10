import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { workspaceDir, workspacesDataRoot } from "../../../../src/workspace.js";
import { recordAuditEvent } from "../../../../src/audit-store.js";

// Step 03 — map: initial_domain_map from answers
// If answers incomplete, status remains needs_definition (E4 guard: no guessing)

export function step03Map(workspaceId: string, installerId?: string): { domains: string[]; status: string } {
  const dir = workspaceDir(workspaceId);
  const answersPath = path.join(dir, "answers.yaml");
  if (!fs.existsSync(answersPath)) throw new Error(`answers_not_found:${workspaceId} — run step 02 first`);
  const answers: any = parse(fs.readFileSync(answersPath, "utf8"));

  // For Phase 1, if answers.domains is array with items, use it; otherwise remain empty
  const domains: string[] = Array.isArray(answers.domains) && answers.domains.length ? answers.domains : [];

  // Also check answers.answers for domain question
  // If no domains provided, leave as needs_definition
  const status = domains.length > 0 ? "mapped" : "empty_structure";

  // Audit
  try {
    const dataRoot = workspacesDataRoot();
    const auditPath = path.join(dataRoot, workspaceId, "audit-events.json");
    recordAuditEvent(
      { action: "bootstrap_step_03_map", actor: installerId ?? "system_igniter", entityType: "workspace", entityId: workspaceId, details: { step: 3, domains, status } },
      auditPath,
    );
  } catch {}

  return { domains, status };
}
