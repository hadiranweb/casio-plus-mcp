import { NextResponse } from 'next/server';

export const CASIO_ROLES = [
  'system_architect', 'method_designer', 'data_analyst', 'memory_steward',
  'automation_owner', 'coaching_documentarian', 'compliance_steward', 'process_coach', 'viewer',
] as const;
export type CasioRole = typeof CASIO_ROLES[number];
export type CasioPermission =
  | 'read:knowledge' | 'write:metric' | 'write:coaching' | 'review:feedback'
  | 'approve:proposal' | 'execute:automation' | 'manage:access';

const POLICY: Record<CasioRole, CasioPermission[]> = {
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

export function actorRole(): CasioRole {
  const value = process.env.CASIO_ACTOR_ROLE ?? 'viewer';
  return (CASIO_ROLES as readonly string[]).includes(value) ? value as CasioRole : 'viewer';
}
export function can(role: CasioRole, permission: CasioPermission) { return POLICY[role].includes(permission); }
export function requirePermission(permission: CasioPermission) {
  const role = actorRole();
  if (can(role, permission)) return { role };
  return { response: NextResponse.json({ error: 'forbidden', required: permission, role }, { status: 403 }) };
}
export function accessOverview() { const role = actorRole(); return { role, permissions: POLICY[role], authMode: process.env.CASIO_SSO_PROVIDER ? 'sso-adapter-pending' : 'trusted-local-role' }; }
