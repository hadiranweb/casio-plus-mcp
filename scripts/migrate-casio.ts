#!/usr/bin/env tsx
/**
 * Phase 0, step 6 — migrate the pre-kernel casio data into the casio
 * workspace (legacy_evidence protocol, D2):
 *   1. write the migration witness file (evidence/migration-witnesses.json,
 *      committed, idempotent)
 *   2. add asset_status: evidence_collected to every playbook in
 *      workspaces/casio/knowledge/casio.yaml (idempotent)
 *
 * Usage: npm run migrate:casio
 */

import { getWorkspace } from "../services/mcp-server/src/workspace.js";
import { ensureMigrationWitnesses, migrateCasioKnowledge } from "../services/mcp-server/src/migration.js";

const ws = getWorkspace("casio");
if (!ws) {
  console.error("[migrate:casio] workspace 'casio' not found");
  process.exit(1);
}

const witnesses = ensureMigrationWitnesses(ws);
const knowledge = migrateCasioKnowledge(ws);

console.log(`[migrate:casio] witnesses: ${witnesses.length} (${witnesses.map((w) => w.evidence_id).join(", ")})`);
console.log(`[migrate:casio] knowledge: asset_status added to ${knowledge.changed}/${knowledge.total} playbooks`);
console.log(`[migrate:casio] witness file: ${ws.dir}/evidence/migration-witnesses.json`);
