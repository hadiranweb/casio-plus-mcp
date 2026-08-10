import fs from "node:fs";
import path from "node:path";
import { createAssetFromTemplate, saveDraftAsset } from "../../../../src/templates.js";
import { getWorkspace, workspacesDataRoot } from "../../../../src/workspace.js";
import { recordAuditEvent } from "../../../../src/audit-store.js";
import { assertNoFakeKnowledge } from "../guard.js";

// Step 05 — create-structures: registries schema-only + assets template_only
// Guard ensures no fake content (template_only / schema_only)

export function step05CreateStructures(workspaceId: string, installerId?: string): { created: number } {
  const ws = getWorkspace(workspaceId);
  if (!ws) throw new Error(`workspace_not_found:${workspaceId}`);

  let created = 0;

  // For each domain, create a registry schema-only and a playbook template_only
  // But per spec, this step should not inject content — only via starter-pack
  const domains = ws.manifest?.domains ?? [];
  // If no domains, create at least one generic registry
  if (domains.length === 0) {
    // Create a single registry schema-only as example of structure
    const asset = createAssetFromTemplate("registry", "رجیستری نمونه", {});
    assertNoFakeKnowledge({ type: "registry", payload: asset as unknown as Record<string, unknown> });
    saveDraftAsset(asset, ws.dataDirAbs);
    created++;
  } else {
    for (const dom of domains) {
      // Registry schema-only
      const reg = createAssetFromTemplate("registry", `رجیستری ${dom.domain_name}`, {});
      assertNoFakeKnowledge({ type: "registry", payload: reg as unknown as Record<string, unknown> });
      saveDraftAsset(reg, ws.dataDirAbs);
      created++;

      // Playbook template_only
      const pb = createAssetFromTemplate("playbook", `پلی‌بوک ${dom.domain_name}`, {});
      assertNoFakeKnowledge({ type: "playbook", payload: pb as unknown as Record<string, unknown> });
      saveDraftAsset(pb, ws.dataDirAbs);
      created++;
    }
  }

  // Also ensure data/registries has at least empty schema files
  const registriesDir = path.join(ws.dir, "registries");
  fs.mkdirSync(registriesDir, { recursive: true });
  if (!fs.existsSync(path.join(registriesDir, ".gitkeep"))) {
    fs.writeFileSync(path.join(registriesDir, ".gitkeep"), "", "utf8");
  }

  try {
    const dataRoot = workspacesDataRoot();
    const auditPath = path.join(dataRoot, workspaceId, "audit-events.json");
    recordAuditEvent(
      { action: "bootstrap_step_05_create_structures", actor: installerId ?? "system_igniter", entityType: "workspace", entityId: workspaceId, details: { step: 5, created } },
      auditPath,
    );
  } catch {}

  return { created };
}
