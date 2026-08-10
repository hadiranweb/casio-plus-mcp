#!/usr/bin/env tsx
// CLI: bootstrap --org {id} --kernel 0.1.0
// E1: CLI file-based, no UI

import { runBootstrap } from "../../../services/bootstrap-engine/src/engine.js";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0) return process.argv[idx + 1];
  // also support --org alias for workspace
  if (name === "org") {
    const i2 = process.argv.indexOf("--workspace");
    if (i2 >= 0) return process.argv[i2 + 1];
  }
  return undefined;
}

const org = arg("org") ?? arg("workspace");
const name = arg("name") ?? arg("displayName") ?? org;
const kernel = arg("kernel") ?? "0.1.0";
const channel = arg("channel") ?? "experimental";
const installer = arg("installer") ?? `hadiranweb:${new Date().toISOString().slice(0, 10)}`;

if (!org) {
  console.error("Usage: npx tsx clients/cli/src/bootstrap.ts --org <workspace_id> [--name <displayName>] [--kernel 0.1.0] [--channel experimental] [--installer hadirweb:2026-08-11]");
  process.exit(1);
}

console.log(`[bootstrap] org=${org} name=${name} kernel=${kernel} channel=${channel} installer=${installer}`);
runBootstrap({ workspaceId: org, displayName: name ?? org, channel, installerId: installer })
  .then((r) => {
    console.log(`[bootstrap] done: workspace=${r.workspaceId} run=${r.bootstrap_run_id} status=field_discovery`);
  })
  .catch((e) => {
    console.error(`[bootstrap] failed:`, e.message);
    process.exit(1);
  });
