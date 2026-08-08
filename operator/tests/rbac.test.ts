import { afterEach, describe, expect, it } from 'vitest';
import { can, requirePermission } from '@/lib/rbac';
import { signedHeadersForTest } from '@/lib/sso';

afterEach(() => { delete process.env.CASIO_ACTOR_ROLE; delete process.env.CASIO_SSO_SHARED_SECRET; });
const req = (headers: Record<string, string> = {}) => new Request('http://localhost/api/test', { headers });

describe('Casio RBAC and SSO adapter', () => {
  it('grants metric writes to data analyst policy', () => expect(can('data_analyst', 'write:metric')).toBe(true));
  it('uses trusted local role only outside production', () => { process.env.CASIO_ACTOR_ROLE = 'viewer'; const result = requirePermission(req(), 'write:coaching'); expect('response' in result).toBe(true); });
  it('accepts a fresh signed SSO identity', () => { const secret = 'test-secret'; process.env.CASIO_SSO_SHARED_SECRET = secret; const result = requirePermission(req(signedHeadersForTest('user-42', 'process_coach', secret)), 'write:coaching'); const actor = 'actor' in result ? result.actor : undefined; expect(actor?.subject).toBe('user-42'); });
  it('rejects tampered SSO role headers', () => { const secret = 'test-secret'; process.env.CASIO_SSO_SHARED_SECRET = secret; const headers = signedHeadersForTest('user-42', 'viewer', secret); headers['x-casio-sso-role'] = 'system_architect'; const result = requirePermission(req(headers), 'manage:access'); expect('response' in result).toBe(true); });
});
