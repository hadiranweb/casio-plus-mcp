#!/usr/bin/env tsx
// CLI: verify --workspace {id}
// Checks manifest/lineage per spec

import fs from "node:fs";
import { parse } from "yaml";
import { loadWorkspace } from "../../../src/workspace.js";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const wsId = arg("workspace") ?? arg("org");
if (!wsId) {
  console.error("Usage: npx tsx clients/cli/src/verify.ts --workspace <id>");
  process.exit(1);
}

try {
  const ws = loadWorkspace(wsId);
  const manifestRaw = fs.readFileSync(ws.manifestPathAbs!, "utf8");
  const manifest: any = parse(manifestRaw);
  const errors: string[] = [];
  if (!manifest.workspace_id) errors.push("missing workspace_id");
  if (!manifest.created_from_kernel_version) errors.push("missing created_from_kernel_version");
  if (!manifest.bootstrap_run_id) errors.push("missing bootstrap_run_id");
  if (!manifest.installer_id) errors.push("missing installer_id");
  if (!["field_discovery", "bootstrapped_empty", "evidence_collecting"].includes(manifest.status)) {
    errors.push(`unexpected status ${manifest.status}`);
  }
  // Check lineage
  if (manifest.created_from_kernel_version !== "0.1.0") errors.push("kernel_version mismatch");
  if (manifest.created_from_specification_version !== "0.5.0") errors.push("spec_version mismatch");

  // Check answers.yaml exists
  const answersPath = `${ws.dir}/answers.yaml`;
  if (!fs.existsSync(answersPath)) errors.push("answers.yaml missing — run step 02");

  // Check evidence witnesses for casio
  if (wsId === "casio") {
    const evPath = `${ws.dir}/evidence/evidence.json`;
    if (fs.existsSync(evPath)) {
      const evs: any[] = JSON.parse(fs.readFileSync(evPath, "utf8"));
      const witnesses = evs.filter((e) => e.source === "migration_legacy");
      if (witnesses.length < 3) errors.push(`casio witnesses missing: ${witnesses.length}/3`);
    }
  }

  if (errors.length) {
    console.error(`[verify] ${wsId} FAILED:`);
    for (const e of errors) console.error("  -", e);
    process.exit(1);
  } else {
    console.log(`[verify] ${wsId} OK — status=${manifest.status} run=${manifest.bootstrap_run_id} lineage=${manifest.created_from_kernel_version}/${manifest.created_from_specification_version}`);
    // Also check enabled levels
    console.log(`[verify] enabled_levels=${manifest.enabled_mcp_tool_levels} disabled=${manifest.disabled_capabilities}`);
  }
} catch (e: any) {
  console.error(`[verify] failed:`, e.message);
  process.exit(1);
}
