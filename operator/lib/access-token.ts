/**
 * Access token lifecycle — how the operator logs in.
 *
 * The single shared token is the "is this instance yours?" credential (see
 * lib/auth.ts). This module owns where that token comes from, in order:
 *
 *   1. `CASIOPLUS_ACCESS_TOKEN` in the process environment — this also covers
 *      `operator/.env.local`, which Next.js loads into process.env at runtime,
 *      so the middleware (edge runtime, no fs) sees the exact same value.
 *   2. A persisted store file (`data/access-token`, mode 0600) — the anchor
 *      that survives restarts and keeps the bootstrap idempotent.
 *   3. First-boot bootstrap (production only): generate a strong token,
 *      persist it, and print it once so the operator can log in in an
 *      environment where no env var was set.
 *
 * Fail-closed is preserved end to end: with no token anywhere the gate still
 * refuses (503 misconfigured) exactly as before. This adds a way to GET a
 * token — never a way to skip one. Development (no NODE_ENV=production)
 * stays zero-config as before.
 */

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ACCESS_TOKEN_ENV, safeEqual } from '@/lib/auth';

/** Where the persisted token lives. Overridable for tests. */
export function tokenStorePath(): string {
  return process.env.CASIOPLUS_TOKEN_STORE ?? path.join(process.cwd(), 'data', 'access-token');
}

/** Read the persisted token, or null when absent/too short to be trusted. */
export function readStoredToken(filePath = tokenStorePath()): string | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    return raw.length >= 16 ? raw : null;
  } catch {
    return null;
  }
}

/** Generate a strong token (64 hex chars), persist it 0600, return it. */
export function bootstrapToken(filePath = tokenStorePath()): string {
  const token = randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${token}\n`, { mode: 0o600 });
  return token;
}

/** SHA-256 fingerprint of a token — for logs and comparisons without the plaintext. */
export function tokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 12);
}

export type AccessTokenResolution = {
  token: string | null;
  source: 'env' | 'store' | 'bootstrap' | 'none';
};

/**
 * The resolution chain: env (covers .env.local) → store → first-boot
 * bootstrap (production only). The token is returned, plus where it came
 * from, so callers can log the source without logging the secret.
 */
export function resolveAccessToken(): AccessTokenResolution {
  const envToken = process.env[ACCESS_TOKEN_ENV]?.trim();
  if (envToken) return { token: envToken, source: 'env' };

  const stored = readStoredToken();
  if (stored) return { token: stored, source: 'store' };

  if (process.env.NODE_ENV === 'production') {
    const token = bootstrapToken();
    // Printed once at first boot so the operator can actually log in. The
    // full secret never goes to the repo (data/ is gitignored).
    // eslint-disable-next-line no-console
    console.log(
      `\n[casio-plus] First boot: no access token configured.\n` +
        `[casio-plus] Generated operator access token (persisted to ${tokenStorePath()}, 0600):\n` +
        `[casio-plus] ${ACCESS_TOKEN_ENV}=${token}\n` +
        `[casio-plus] Log in at /unlock with this token (fingerprint ${tokenFingerprint(token)}).\n`,
    );
    return { token, source: 'bootstrap' };
  }

  return { token: null, source: 'none' };
}

/** Constant-time verification against the resolved token. */
export function verifyAccessToken(presented: string | undefined): boolean {
  if (!presented) return false;
  const { token } = resolveAccessToken();
  return token ? safeEqual(presented, token) : false;
}
