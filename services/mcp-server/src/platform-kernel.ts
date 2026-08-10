import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { z } from "zod";

/**
 * Platform Kernel — the brand-agnostic core of the Element Ecosystem.
 *
 * Layer 2 of the General Ecosystem Spec:
 *   - platform-kernel.yaml     : the kernel manifest (constitution, primitives,
 *                                policies, capabilities, bootstrap gate)
 *   - core/constitution/*      : immutable principles, governance, firewall
 *   - core/primitives/*        : schema YAML per primitive (incl. evidence)
 *   - core/policies/*          : policy YAML (quality, versioning, approval,
 *                                rbac, no-fake-knowledge)
 *   - core/bootstrap/*         : workspace manifest schema, installer
 *                                protocol, starter pack
 *   - core/mcp/*               : tool contracts (levels 0-4), resources,
 *                                prompts
 *
 * The kernel contains NO organizational data — it is the rules of the game.
 * Each workspace (organization/brand) is born from it and builds its own
 * memory with real field evidence.
 */

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_KERNEL_PATH = path.resolve(moduleDir, "../../../platform-kernel.yaml");
export const CORE_DIR = path.resolve(moduleDir, "../../../core");
export const DEFAULT_ECOSYSTEM_SPEC_PATH = path.resolve(moduleDir, "../../../docs/spec/general_ecosystem.yaml");
export const DEFAULT_VERSION_PATH = path.join(CORE_DIR, "VERSION");

// ---------------------------------------------------------------------------
// Kernel manifest (platform-kernel.yaml)
// ---------------------------------------------------------------------------

const kernelSchema = z.object({
  version: z.number().int().positive(),
  constitution: z.array(z.string().min(1)).min(1),
  primitives: z.array(z.string().min(1)).min(1),
  policies: z.array(z.string().min(1)).min(1),
  mcp_capabilities: z.array(z.string().min(1)).min(1),
  bootstrap_tools_enabled: z.array(z.string().min(1)).min(1),
  disabled_until_evidence: z.array(z.string().min(1)).min(1),
});

export type PlatformKernel = z.infer<typeof kernelSchema>;

export function loadPlatformKernel(filePath = DEFAULT_KERNEL_PATH): PlatformKernel {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Platform kernel file not found: ${filePath}`);
  }
  const parsed = parse(fs.readFileSync(filePath, "utf8"));
  const result = kernelSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid platform kernel YAML: ${result.error.message}`);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// MCP tool contracts (core/mcp/tools.yaml) — levels 0-4
// ---------------------------------------------------------------------------

export type ToolLevel = 0 | 1 | 2 | 3 | 4;

export type ToolMeta = {
  name: string;
  level: ToolLevel;
  effect_type?: string;
  risk_level?: "none" | "low" | "medium" | "high";
  approval_required?: boolean;
  audit_required?: boolean;
  evidence_threshold?: number;
  rollback_strategy?: string;
  idempotency_key_required?: boolean;
  deprecated_alias?: boolean;
};

const toolMetaSchema = z.object({
  name: z.string().min(1),
  level: z.number().int().min(0).max(4),
  effect_type: z.string().optional(),
  risk_level: z.enum(["none", "low", "medium", "high"]).optional(),
  approval_required: z.boolean().optional(),
  audit_required: z.boolean().optional(),
  evidence_threshold: z.number().optional(),
  rollback_strategy: z.string().optional(),
  idempotency_key_required: z.boolean().optional(),
  deprecated_alias: z.boolean().optional(),
});

const toolsFileSchema = z.object({
  version: z.union([z.number(), z.string()]),
  levels: z.record(z.string(), z.string()),
  tools: z.array(toolMetaSchema).min(1),
});

/** Load core/mcp/tools.yaml → Map<toolName, ToolMeta>. */
export function loadKernelTools(filePath = path.join(CORE_DIR, "mcp", "tools.yaml")): Map<string, ToolMeta> {
  const raw = parse(fs.readFileSync(filePath, "utf8"));
  const parsed = toolsFileSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Invalid core/mcp/tools.yaml: ${parsed.error.message}`);
  return new Map(parsed.data.tools.map((tool) => [tool.name, tool as ToolMeta]));
}

export function toolLevelFor(name: string): ToolLevel | undefined {
  return loadKernelTools().get(name)?.level;
}

// ---------------------------------------------------------------------------
// Kernel version (core/VERSION)
// ---------------------------------------------------------------------------

const kernelVersionSchema = z.object({
  kernel_version: z.string().min(1),
  specification_version: z.string().min(1),
});

export type KernelVersion = z.infer<typeof kernelVersionSchema>;

/** Load core/VERSION — the kernel + spec version the platform is on. */
export function loadKernelVersion(filePath = DEFAULT_VERSION_PATH): KernelVersion {
  if (!fs.existsSync(filePath)) throw new Error(`core/VERSION not found: ${filePath}`);
  const parsed = parse(fs.readFileSync(filePath, "utf8"));
  const result = kernelVersionSchema.safeParse(parsed);
  if (!result.success) throw new Error(`Invalid core/VERSION: ${result.error.message}`);
  return result.data;
}

// ---------------------------------------------------------------------------
// General Ecosystem Spec (layer 1)
// ---------------------------------------------------------------------------

const specSchema = z.object({
  spec_version: z.string().min(1),
  name: z.string().min(1),
  primitive_types: z.array(z.string().min(1)),
  policies: z.array(z.string().min(1)),
  mcp_tool_levels: z.record(z.string(), z.string()),
  formula: z.string().optional(),
});

export type EcosystemSpec = z.infer<typeof specSchema>;

export function loadEcosystemSpec(filePath = DEFAULT_ECOSYSTEM_SPEC_PATH): EcosystemSpec {
  const raw = parse(fs.readFileSync(filePath, "utf8"));
  const parsed = specSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Invalid general_ecosystem.yaml: ${parsed.error.message}`);
  return parsed.data;
}
