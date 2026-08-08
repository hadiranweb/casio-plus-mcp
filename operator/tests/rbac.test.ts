import { afterEach, describe, expect, it } from 'vitest';
import { actorRole, can, requirePermission } from '@/lib/rbac';

afterEach(() => { delete process.env.CASIO_ACTOR_ROLE; });
describe('Casio RBAC policy', () => {
  it('grants metric writes to data analyst', () => { process.env.CASIO_ACTOR_ROLE = 'data_analyst'; expect(can(actorRole(), 'write:metric')).toBe(true); });
  it('blocks viewer from coaching writes', () => { process.env.CASIO_ACTOR_ROLE = 'viewer'; const result = requirePermission('write:coaching'); expect('response' in result).toBe(true); });
  it('grants proposal approval to memory steward', () => { process.env.CASIO_ACTOR_ROLE = 'memory_steward'; expect(can(actorRole(), 'approve:proposal')).toBe(true); });
});
