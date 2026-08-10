import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { z } from "zod";

/**
 * Platform Kernel — the brand-agnostic core of the Element Ecosystem.
 *
 * Loads and validates platform-kernel.yaml (the constitution, primitives,
 * policies, MCP capabilities and the bootstrap capability gate). The kernel
 * contains NO organizational data — it is the rules of the game. Each
 * workspace (organization/brand) is born from it and builds its own memory.
 */

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

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_KERNEL_PATH = path.resolve(moduleDir, "../platform-kernel.yaml");

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
