import { describe, expect, it } from 'vitest';
import { can, CASIO_ROLES, type CasioPermission } from '@/lib/rbac';

/**
 * The intended Authorization Matrix (General Plan, section C + GenFlow
 * section 7): role × permission. This table encodes INTENT — if the policy
 * in lib/rbac.ts drifts from it, this test fails loudly.
 *
 * reader-only baseline: every role reads knowledge. Sensitive permissions
 * are gated per role; no role below compliance_steward manages access.
 */
const INTENDED_MATRIX: Record<string, CasioPermission[]> = {
  system_architect: ['read:knowledge', 'review:feedback', 'approve:proposal', 'manage:access'],
  method_designer: ['read:knowledge', 'review:feedback'],
  data_analyst: ['read:knowledge', 'write:metric', 'review:feedback'],
  memory_steward: ['read:knowledge', 'review:feedback', 'approve:proposal'],
  automation_owner: ['read:knowledge', 'execute:automation'],
  coaching_documentarian: ['read:knowledge', 'write:coaching'],
  compliance_steward: ['read:knowledge', 'review:feedback', 'approve:proposal', 'manage:access'],
  process_coach: ['read:knowledge', 'write:coaching', 'write:metric'],
  viewer: ['read:knowledge'],
};

const ALL_PERMISSIONS: CasioPermission[] = [
  'read:knowledge',
  'write:metric',
  'write:coaching',
  'review:feedback',
  'approve:proposal',
  'execute:automation',
  'manage:access',
];

describe('authorization matrix (role × permission)', () => {
  it('covers every registered role and every registered permission', () => {
    expect(Object.keys(INTENDED_MATRIX).sort()).toEqual([...CASIO_ROLES].sort());
    for (const perms of Object.values(INTENDED_MATRIX)) {
      for (const perm of perms) expect(ALL_PERMISSIONS).toContain(perm);
    }
  });

  it('grants exactly the intended permissions to every role', () => {
    for (const [role, intended] of Object.entries(INTENDED_MATRIX)) {
      const actual = ALL_PERMISSIONS.filter((perm) => can(role as never, perm));
      expect(actual.sort()).toEqual([...intended].sort());
    }
  });

  it('the reader-only baseline holds: every role can read knowledge', () => {
    for (const role of CASIO_ROLES) expect(can(role, 'read:knowledge')).toBe(true);
  });

  it('sensitive gates hold: only compliance/system_architect manage access; only automation_owner executes', () => {
    const managers = CASIO_ROLES.filter((r) => can(r, 'manage:access'));
    expect(managers.sort()).toEqual(['compliance_steward', 'system_architect']);
    const executors = CASIO_ROLES.filter((r) => can(r, 'execute:automation'));
    expect(executors).toEqual(['automation_owner']);
  });
});
