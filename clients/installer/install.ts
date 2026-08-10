#!/usr/bin/env tsx
/**
 * Stub Installer CLI — System Igniter
 * در فاز واقعی، این فایل MCP client می‌شود و create_workspace را صدا می‌زند.
 * فعلاً workspace را مستقیماً via src/workspace.ts می‌سازد (همان logic).
 */
import { bootstrapWorkspace, defineDomain, assignOwner } from "../../src/workspace.js";

const args = process.argv.slice(2);
function arg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const id = arg("id") ?? "acme";
const displayName = arg("displayName") ?? "Acme Co";
const domains = (arg("domains") ?? "sales,education").split(",").map((s) => s.trim()).filter(Boolean);

console.log(`[installer] bootstrapping workspace "${id}" (${displayName}) ...`);
const ws = bootstrapWorkspace({ id, displayName });
console.log(`[installer] workspace created: ${ws.dir}`);

for (const d of domains) {
  console.log(`[installer] defining domain ${d} ...`);
  try {
    defineDomain(id, { domain_id: d, domain_name: d });
  } catch (e) {
    console.log(`[installer] domain ${d} already exists or failed:`, (e as Error).message);
  }
}

if (arg("owner")) {
  const owner = arg("owner")!;
  const first = domains[0];
  console.log(`[installer] assigning owner ${owner} to ${first} ...`);
  assignOwner(id, first, owner);
}

console.log("[installer] done. Next: capture field observations via MCP.");
