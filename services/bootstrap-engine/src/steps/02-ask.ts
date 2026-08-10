import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { workspaceDir, workspacesDataRoot } from "../../../../src/workspace.js";
import { recordAuditEvent } from "../../../../src/audit-store.js";

// Step 02 — ask: generate organization_profile_questions into answers.yaml

export function step02Ask(workspaceId: string, installerId?: string): string {
  const dir = workspaceDir(workspaceId);
  const manifestPath = path.join(dir, "manifest.yaml");
  if (!fs.existsSync(manifestPath)) throw new Error(`workspace_not_found:${workspaceId}`);

  const answersPath = path.join(dir, "answers.yaml");
  // If already exists, idempotent: return existing
  if (fs.existsSync(answersPath)) {
    return answersPath;
  }

  // Read questions from installer-protocol.yaml
  const protocolRaw = fs.readFileSync("core/bootstrap/installer-protocol.yaml", "utf8");
  const protocol: any = parse(protocolRaw);
  const questions: string[] = protocol.bootstrap_questions ?? [];

  const answers: Record<string, unknown> = {
    workspace_id: workspaceId,
    installer_id: installerId ?? "system_igniter",
    generated_at: new Date().toISOString(),
    // Questions with empty answers — to be filled by workspace owner (E4)
    answers: Object.fromEntries(questions.map((q) => [q, null])),
    // Structured fields for Phase 1
    organization_profile: "needs_definition",
    domains: [],
    owners: {},
  };

  fs.writeFileSync(answersPath, stringify(answers), "utf8");

  // Audit
  try {
    const dataRoot = workspacesDataRoot();
    const auditPath = path.join(dataRoot, workspaceId, "audit-events.json");
    recordAuditEvent(
      { action: "bootstrap_step_02_ask", actor: installerId ?? "system_igniter", entityType: "workspace", entityId: workspaceId, details: { step: 2, answersPath } },
      auditPath,
    );
  } catch {}

  return answersPath;
}
