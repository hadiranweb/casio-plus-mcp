import path from 'node:path';
import fs from 'node:fs';
import { openDb, type CasioDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { seedCasioOperator } from '@/lib/casio-seed';

/**
 * App-level singleton. Larp-first, real-ready: every page and API route reads
 * through this seeded SQLite database, so swapping in live sources later is a
 * repo-level change, not a UI rewrite.
 */
let instance: CasioDb | null = null;

export function getDb(): CasioDb {
  if (instance) return instance;
  const dbPath = process.env.CASIOPLUS_DB ?? path.join(process.cwd(), 'data', 'casioplus.db');
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  instance = openDb(dbPath);
  // Seed on first touch so a fresh clone boots looking alive. Each clause
  // back-fills databases created before that table existed; seedDatabase is
  // idempotent (INSERT OR REPLACE), so re-running only adds what's missing.
  if (
    instance.departments.all().length === 0 ||
    instance.workflows.all().length === 0 ||
    instance.skills.all().length === 0 ||
    instance.social.accounts().length === 0 ||
    instance.emailList.snapshots().length === 0 ||
    instance.social.dmSnapshots().length === 0 ||
    instance.social.dmMessages().length === 0
  ) {
    seedDatabase(instance);
  }
  // CasioPlus overlays the upstream demo data at the repository boundary.
  // The UI remains CasioPlus; departments, agents, metrics, domains and roadmap
  // become the native Casio model sourced from knowledge/casio.yaml.
  seedCasioOperator(instance);
  return instance;
}
