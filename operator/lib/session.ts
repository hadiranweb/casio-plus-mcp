import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Session tokens — the Display island's signed login session, verified on
 * the operator (node runtime) side. The bridge signs with the same
 * HMAC-SHA256("payload", CASIO_AUTH_SECRET) scheme (see
 * services/mcp-server/src/users.ts); this module is the operator's
 * verifier so the UI trusts only tokens the identity island issued.
 */

export type SessionPayload = {
  sub: string;
  role: string;
  ws?: string;
  exp: number;
};

export function signSession(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string, secret: string): SessionPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}
