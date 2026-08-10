#!/usr/bin/env tsx
// CLI: state --workspace {id}
// Shows status + next step

import fs from "node:fs";
import { loadWorkspace, workspaceReadiness, evidenceCount } from "../../../src/workspace.js";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const wsId = arg("workspace") ?? arg("org");
if (!wsId) {
  console.error("Usage: npx tsx clients/cli/src/state.ts --workspace <id>");
  process.exit(1);
}

try {
  const ws = loadWorkspace(wsId);
  const readiness = workspaceReadiness(ws);
  const evidence = evidenceCount(ws);
  const status = ws.manifest?.status ?? ws.config.bootstrap;
  console.log(`[state] workspace=${wsId} display=${ws.config.displayName}`);
  console.log(`[state] status=${ws.manifest?.status} readiness=${readiness} evidence=${evidence}`);
  console.log(`[state] enabled_levels=${ws.manifest?.enabled_mcp_tool_levels}`);
  console.log(`[state] bootstrap_run=${ws.manifest?.bootstrap_run_id}`);
  // Next step hint
  if (ws.manifest?.status === "bootstrapped_empty") {
    console.log("[state] next: run step 02-07 to reach field_discovery (bootstrap)");
  } else if (ws.manifest?.status === "field_discovery") {
    console.log("[state] next: capture_field_observation (Level 1) → evidence_collecting");
  } else {
    console.log("[state] next: evidence → review → proposal → operationalizing");
  }
  // Check answers
  const answersPath = `${ws.dir}/answers.yaml`;
  if (fs.existsSync(answersPath)) {
    console.log(`[state] answers: ${answersPath} exists`);
  } else {
    console.log(`[state] answers: missing — run bootstrap step 02`);
  }
} catch (e: any) {
  console.error(`[state] failed:`, e.message);
  process.exit(1);
}
