import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { CORE_DIR } from "./platform-kernel.js";

/**
 * RBAC policy loader — the normative role × permission matrix lives in
 * core/policies/rbac.yaml (the same file the docs/tests treat as the norm).
 * The operator/ frontend keeps its own copy; this is the platform layer's
 * source of truth for the Element Ecosystem.
 */

const rbacPolicySchema = z.object({
  id: z.string(),
  version: z.string(),
  enforcement: z.enum(["gate", "audit", "convention"]),
  audit_required: z.boolean(),
  roles: z.array(z.string().min(1)).min(1),
  permissions: z.array(z.string().min(1)).min(1),
  role_permissions: z.record(z.string(), z.array(z.string().min(1))),
  baseline: z.string().optional(),
  sensitive: z.record(z.string(), z.array(z.string().min(1))).optional(),
});

export type RbacPolicy = z.infer<typeof rbacPolicySchema>;

export const DEFAULT_RBAC_POLICY_PATH = path.join(CORE_DIR, "policies", "rbac.yaml");

let cached: RbacPolicy | undefined;

export function loadRbacPolicy(filePath = DEFAULT_RBAC_POLICY_PATH): RbacPolicy {
  if (cached) return cached;
  const parsed = parse(fs.readFileSync(filePath, "utf8"));
  const result = rbacPolicySchema.safeParse(parsed);
  if (!result.success) throw new Error(`Invalid core/policies/rbac.yaml: ${result.error.message}`);
  // every declared permission must be granted to at least one role; every
  // granted permission must be declared
  const granted = new Set(Object.values(result.data.role_permissions).flat());
  for (const permission of result.data.permissions) {
    if (!granted.has(permission)) throw new Error(`rbac policy: permission "${permission}" granted to no role`);
  }
  for (const permission of granted) {
    if (!result.data.permissions.includes(permission)) {
      throw new Error(`rbac policy: role_permissions grants undeclared "${permission}"`);
    }
  }
  cached = result.data;
  return cached;
}
