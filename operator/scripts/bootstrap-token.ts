#!/usr/bin/env tsx
/**
 * token:init — make the internal environment login-ready.
 *
 * Resolves the operator access token through the same chain as the server
 * (lib/access-token.ts) and makes it visible to a plain `next start`:
 *
 *   env (CASIOPLUS_ACCESS_TOKEN) → store (data/access-token) → first-boot
 *   generate
 *
 * then writes `operator/.env.local` (gitignored; Next loads it into
 * process.env at runtime, so the edge middleware sees it too) and prints the
 * token. Idempotent: an existing env value or .env.local value wins.
 *
 * Usage: npm run token:init
 */

import fs from 'node:fs';
import path from 'node:path';
import { ACCESS_TOKEN_ENV } from '../lib/auth';
import { bootstrapToken, readStoredToken, tokenFingerprint, tokenStorePath } from '../lib/access-token';

function localEnvPath(): string {
  return path.join(process.cwd(), '.env.local');
}

/** Add CASIOPLUS_ACCESS_TOKEN to .env.local if it isn't there already. */
function ensureLocalEnv(token: string): void {
  const file = localEnvPath();
  let content = '';
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    // first run — nothing to preserve
  }
  if (new RegExp(`^${ACCESS_TOKEN_ENV}=`, 'm').test(content)) return; // an operator-chosen value wins
  const line = `${ACCESS_TOKEN_ENV}=${token}\n`;
  fs.appendFileSync(file, content === '' || content.endsWith('\n') ? line : `\n${line}`);
}

const envToken = process.env[ACCESS_TOKEN_ENV]?.trim();
const token = envToken ?? readStoredToken() ?? bootstrapToken();
ensureLocalEnv(token);

console.log(`[casio-plus] ${ACCESS_TOKEN_ENV}=${token}`);
console.log(
  `[casio-plus] source: ${envToken ? 'environment' : 'store/first-boot'} · ` +
    `store: ${tokenStorePath()} · .env.local: ${localEnvPath()} · fingerprint ${tokenFingerprint(token)}`,
);
