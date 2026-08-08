import { createHmac, timingSafeEqual } from 'node:crypto';
import { CASIO_ROLES, type CasioRole } from '@/lib/rbac-types';

export type CasioActor = {
  subject: string;
  role: CasioRole;
  mode: 'sso-proxy' | 'trusted-local-role';
};

type ResolveResult = { actor: CasioActor } | { error: string };
const MAX_AGE_MS = 5 * 60_000;

function validRole(value: string): value is CasioRole { return (CASIO_ROLES as readonly string[]).includes(value); }
function signatureFor(payload: string, secret: string): string { return createHmac('sha256', secret).update(payload).digest('hex'); }
function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * Production identity adapter. A configured SSO/reverse-proxy authenticates the
 * user, then adds signed identity headers. This app validates their integrity,
 * timestamp and Casio role before RBAC is evaluated.
 */
export function resolveActor(request: Request): ResolveResult {
  const secret = process.env.CASIO_SSO_SHARED_SECRET;
  if (secret) {
    const subject = request.headers.get('x-casio-sso-subject')?.trim() ?? '';
    const role = request.headers.get('x-casio-sso-role')?.trim() ?? '';
    const timestamp = request.headers.get('x-casio-sso-timestamp')?.trim() ?? '';
    const signature = request.headers.get('x-casio-sso-signature')?.trim() ?? '';
    const millis = Date.parse(timestamp);
    if (!subject || !validRole(role) || !Number.isFinite(millis) || !signature) return { error: 'missing_or_invalid_sso_identity' };
    if (Math.abs(Date.now() - millis) > MAX_AGE_MS) return { error: 'expired_sso_identity' };
    const payload = `${subject}.${role}.${timestamp}`;
    if (!safeEqualHex(signature, signatureFor(payload, secret))) return { error: 'invalid_sso_signature' };
    return { actor: { subject, role, mode: 'sso-proxy' } };
  }

  // Local-only development fallback. It never activates in a production build.
  if (process.env.NODE_ENV !== 'production') {
    const role = process.env.CASIO_ACTOR_ROLE ?? 'viewer';
    return { actor: { subject: 'local-development', role: validRole(role) ? role : 'viewer', mode: 'trusted-local-role' } };
  }
  return { error: 'sso_not_configured' };
}

export function signedHeadersForTest(subject: string, role: CasioRole, secret: string, timestamp = new Date().toISOString()) {
  const payload = `${subject}.${role}.${timestamp}`;
  return { 'x-casio-sso-subject': subject, 'x-casio-sso-role': role, 'x-casio-sso-timestamp': timestamp, 'x-casio-sso-signature': signatureFor(payload, secret) };
}
