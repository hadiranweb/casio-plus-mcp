import { createHmac, timingSafeEqual } from 'node:crypto';
import { CASIO_ROLES, type CasioRole } from '@/lib/rbac-types';
import { SESSION_COOKIE } from '@/lib/auth';
import { verifySessionToken } from '@/lib/session';

export type CasioActor = {
  subject: string;
  role: CasioRole;
  mode: 'sso-proxy' | 'trusted-local-role' | 'session';
  workspace?: string;
};

type ResolveResult = { actor: CasioActor } | { error: string };
const MAX_AGE_MS = 5 * 60_000;

function validRole(value: string): value is CasioRole { return (CASIO_ROLES as readonly string[]).includes(value); }
function signatureFor(payload: string, secret: string): string { return createHmac('sha256', secret).update(payload).digest('hex'); }
function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(a) || !/^[0-9a-f]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/** The session cookie value from a Next request (route handlers have cookies). */
function sessionCookieFrom(request: Request): string | null {
  const cookies = (request as unknown as { cookies?: { get?: (name: string) => { value?: string } | undefined } }).cookies;
  const value = cookies?.get?.(SESSION_COOKIE)?.value;
  return value ?? null;
}

/**
 * Production identity adapter. Sources, in order:
 *   1. a Display-island session token in the session cookie (login via
 *      /api/auth/login — the user's role comes from the signed token);
 *   2. SSO/reverse-proxy signed identity headers;
 *   3. local-only development fallback.
 */
export function resolveActor(request: Request): ResolveResult {
  // 1. Display-island session (signed by the identity island, same secret)
  const authSecret = process.env.CASIOPLUS_AUTH_SECRET;
  if (authSecret) {
    const cookie = sessionCookieFrom(request);
    if (cookie) {
      const payload = verifySessionToken(cookie, authSecret);
      if (payload) {
        const role = validRole(payload.role) ? payload.role : 'viewer';
        return { actor: { subject: payload.sub, role, mode: 'session', workspace: payload.ws } };
      }
    }
  }

  // 2. SSO proxy headers
  const secret = process.env.CASIO_SSO_SHARED_SECRET;
  if (secret) {
    const subject = request.headers.get('x-casio-sso-subject')?.trim() ?? '';
    const role = request.headers.get('x-casio-sso-role')?.trim() ?? '';
    const timestamp = request.headers.get('x-casio-sso-timestamp')?.trim() ?? '';
    const signature = request.headers.get('x-casio-sso-signature')?.trim() ?? '';
    const workspace = request.headers.get('x-casio-sso-workspace')?.trim() || undefined;
    const millis = Date.parse(timestamp);
    if (!subject || !validRole(role) || !Number.isFinite(millis) || !signature) return { error: 'missing_or_invalid_sso_identity' };
    if (Math.abs(Date.now() - millis) > MAX_AGE_MS) return { error: 'expired_sso_identity' };
    const payload = `${subject}.${role}.${timestamp}`;
    if (!safeEqualHex(signature, signatureFor(payload, secret))) return { error: 'invalid_sso_signature' };
    return { actor: { subject, role, mode: 'sso-proxy', workspace } };
  }

  // 3. Local-only development fallback. It never activates in a production build.
  if (process.env.NODE_ENV !== 'production') {
    const role = process.env.CASIOPLUS_ACTOR_ROLE ?? 'viewer';
    return { actor: { subject: 'local-development', role: validRole(role) ? role : 'viewer', mode: 'trusted-local-role' } };
  }
  return { error: 'sso_not_configured' };
}

export function signedHeadersForTest(subject: string, role: CasioRole, secret: string, timestamp = new Date().toISOString()) {
  const payload = `${subject}.${role}.${timestamp}`;
  return { 'x-casio-sso-subject': subject, 'x-casio-sso-role': role, 'x-casio-sso-timestamp': timestamp, 'x-casio-sso-signature': signatureFor(payload, secret) };
}
