import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bootstrapToken,
  readStoredToken,
  resolveAccessToken,
  tokenFingerprint,
  tokenStorePath,
  verifyAccessToken,
} from '@/lib/access-token';

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIOPLUS_TOKEN_STORE;
  delete process.env.CASIOPLUS_ACCESS_TOKEN;
  vi.unstubAllEnvs();
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'casio-token-'));
  dirs.push(d);
  process.env.CASIOPLUS_TOKEN_STORE = path.join(d, 'access-token');
  return d;
}

describe('access token lifecycle (login in the internal environment)', () => {
  it('prefers the environment token over the store', () => {
    setup();
    process.env.CASIOPLUS_ACCESS_TOKEN = 'env-token-0123456789abcdef';
    fs.writeFileSync(process.env.CASIOPLUS_TOKEN_STORE!, 'store-token-0123456789abcdef\n');
    const r = resolveAccessToken();
    expect(r.source).toBe('env');
    expect(r.token).toBe('env-token-0123456789abcdef');
    expect(verifyAccessToken('env-token-0123456789abcdef')).toBe(true);
    expect(verifyAccessToken('store-token-0123456789abcdef')).toBe(false);
  });

  it('falls back to the persisted store when no env token is set', () => {
    setup();
    const stored = 'store-token-0123456789abcdef';
    fs.writeFileSync(process.env.CASIOPLUS_TOKEN_STORE!, `${stored}\n`);
    const r = resolveAccessToken();
    expect(r.source).toBe('store');
    expect(r.token).toBe(stored);
    expect(verifyAccessToken(stored)).toBe(true);
  });

  it('bootstraps a strong token on first boot in production and persists it idempotently', () => {
    setup();
    vi.stubEnv('NODE_ENV', 'production');
    const first = resolveAccessToken();
    expect(first.source).toBe('bootstrap');
    expect(first.token).toMatch(/^[0-9a-f]{64}$/);
    // persisted 0600
    const stat = fs.statSync(process.env.CASIOPLUS_TOKEN_STORE!);
    expect(stat.mode & 0o777).toBe(0o600);
    // idempotent: second resolution reads the store, same token
    const second = resolveAccessToken();
    expect(second.source).toBe('store');
    expect(second.token).toBe(first.token);
    expect(verifyAccessToken(first.token!)).toBe(true);
    expect(verifyAccessToken('wrong-token')).toBe(false);
  });

  it('never bootstraps outside production — dev stays zero-config', () => {
    setup();
    const r = resolveAccessToken();
    expect(r.source).toBe('none');
    expect(r.token).toBeNull();
    expect(verifyAccessToken('anything')).toBe(false);
  });

  it('treats a missing/too-short store as absent', () => {
    setup();
    fs.writeFileSync(process.env.CASIOPLUS_TOKEN_STORE!, 'short\n');
    expect(readStoredToken()).toBeNull();
    expect(readStoredToken(path.join(dirs[0], 'does-not-exist'))).toBeNull();
  });

  it('bootstrapToken and tokenFingerprint behave', () => {
    setup();
    const t = bootstrapToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenFingerprint(t)).toMatch(/^[0-9a-f]{12}$/);
    expect(tokenFingerprint('a')).not.toBe(tokenFingerprint('b'));
    expect(tokenStorePath()).toBe(process.env.CASIOPLUS_TOKEN_STORE);
  });
});
