import { loadRbacPolicy } from "./rbac-policy.js";
import { loadKernelTools } from "./platform-kernel.js";
import type { Actor } from "./actor.js";

/**
 * Access control for the Element Ecosystem — the enforcement half of
 * core/policies/rbac.yaml + the required_permission on every tool contract.
 *
 *   can(role, permission)          — role × permission matrix
 *   permissionForTool(tool)        — from core/mcp/tools.yaml
 *   canTool(actor, tool)           — both combined
 *   requirePermission(actor, perm) — throws permission_denied:<perm> for <role>
 *   assertWorkspaceAccess(actor, wsId) — tenant isolation via actor scope
 */

export type Permission = string;

export function can(role: string, permission: Permission): boolean {
  const policy = loadRbacPolicy();
  const granted = policy.role_permissions[role];
  if (!granted) return false;
  return granted.includes(permission);
}

/** The permission a tool requires, from its contract. */
export function permissionForTool(tool: string): Permission | undefined {
  return loadKernelTools().get(tool)?.required_permission;
}

export function canTool(actor: Actor, tool: string): boolean {
  const permission = permissionForTool(tool);
  if (!permission) return false; // unknown tool → deny
  return can(actor.role, permission);
}

export function requirePermission(actor: Actor, permission: Permission): void {
  if (!can(actor.role, permission)) {
    throw new Error(`permission_denied:${permission} for role ${actor.role}`);
  }
}

/** Tenant isolation: a scoped actor may only touch its own workspace. */
export function assertWorkspaceAccess(actor: Actor, workspaceId: string): void {
  if (actor.workspace && actor.workspace !== workspaceId && !can(actor.role, "manage:access")) {
    throw new Error(`workspace_forbidden:${workspaceId} (actor scoped to ${actor.workspace})`);
  }
}

/** Convenience for handlers: resolve actor, require tool permission, return actor. */
export function authorizeTool(actor: Actor, tool: string): void {
  if (!canTool(actor, tool)) {
    throw new Error(`permission_denied:${permissionForTool(tool)} for role ${actor.role} (tool ${tool})`);
  }
}
