import { describe, expect, it } from 'vitest';
import { signSession, verifySessionToken } from '@/lib/session';
import { verifySessionTokenWeb } from '@/lib/session-web';

const SECRET = 'test-secret-0123456789abcdef';

describe('session tokens (Display island login, operator side)', () => {
  it('signs and verifies a session payload', () => {
    const token = signSession({ sub: 'ali', role: 'process_coach', ws: 'casio', exp: Date.now() + 60_000 }, SECRET);
    const payload = verifySessionToken(token, SECRET);
    expect(payload?.sub).toBe('ali');
    expect(payload?.role).toBe('process_coach');
    expect(payload?.ws).toBe('casio');
  });

  it('rejects tampered tokens and expired sessions', () => {
    const token = signSession({ sub: 'ali', role: 'viewer', exp: Date.now() + 60_000 }, SECRET);
    const [body] = token.split('.');
    const tampered = `${body}.${'f'.repeat(43)}`;
    expect(verifySessionToken(tampered, SECRET)).toBeNull();
    const expired = signSession({ sub: 'ali', role: 'viewer', exp: Date.now() - 1000 }, SECRET);
    expect(verifySessionToken(expired, SECRET)).toBeNull();
  });

  it('web verifier (middleware) accepts tokens signed with node crypto', async () => {
    const token = signSession({ sub: 'sara', role: 'system_architect', exp: Date.now() + 60_000 }, SECRET);
    const payload = await verifySessionTokenWeb(token, SECRET);
    expect(payload?.sub).toBe('sara');
    expect(payload?.role).toBe('system_architect');
  });

  it('web verifier rejects tampering and wrong secret', async () => {
    const token = signSession({ sub: 'sara', role: 'viewer', exp: Date.now() + 60_000 }, SECRET);
    const [body] = token.split('.');
    expect(await verifySessionTokenWeb(`${body}.bad`, SECRET)).toBeNull();
    expect(await verifySessionTokenWeb(token, 'wrong-secret-0000000000000000')).toBeNull();
  });
});
