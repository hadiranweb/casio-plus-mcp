import { NextResponse } from 'next/server';
import { resolveActor, type CasioActor } from '@/lib/sso';
import { CASIO_ROLES, type CasioPermission, type CasioRole } from '@/lib/rbac-types';
export { CASIO_ROLES, type CasioPermission, type CasioRole } from '@/lib/rbac-types';

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
export function can(role: CasioRole, permission: CasioPermission) { return POLICY[role].includes(permission); }
export function requirePermission(request: Request, permission: CasioPermission) {
  const identity = resolveActor(request);
  if ('error' in identity) return { response: NextResponse.json({ error: identity.error, required: permission }, { status: 401 }) };
  if (can(identity.actor.role, permission)) return { actor: identity.actor };
  return { response: NextResponse.json({ error: 'forbidden', required: permission, role: identity.actor.role }, { status: 403 }) };
}
export function accessOverview(request: Request) {
  const identity = resolveActor(request);
  if ('error' in identity) return { authenticated: false, error: identity.error, authMode: process.env.CASIO_SSO_SHARED_SECRET ? 'sso-proxy' : 'unconfigured' };
  const actor: CasioActor = identity.actor;
  return { authenticated: true, subject: actor.subject, role: actor.role, permissions: POLICY[actor.role], authMode: actor.mode };
}
