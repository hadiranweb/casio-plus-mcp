// Kernel — بارگذاری core/ + نسخه + fail-fast
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(moduleDir, "../../../");

export const DEFAULT_KERNEL_PATH = path.resolve(rootDir, "platform-kernel.yaml");
export const CORE_VERSION_PATH = path.resolve(rootDir, "core/VERSION");
export const SPEC_PATH = path.resolve(rootDir, "docs/spec/general_ecosystem.yaml");

export type KernelLoadResult = {
  kernel: unknown;
  coreVersion: { kernel_version: string; specification_version: string };
  specVersion: string;
};

export function loadKernelWithVersionCheck(): KernelLoadResult {
  // Fail-fast if core files missing
  if (!fs.existsSync(CORE_VERSION_PATH)) throw new Error(`core/VERSION missing: ${CORE_VERSION_PATH}`);
  if (!fs.existsSync(SPEC_PATH)) throw new Error(`docs/spec/general_ecosystem.yaml missing`);
  const coreRaw = fs.readFileSync(CORE_VERSION_PATH, "utf8");
  const core = parse(coreRaw) as { kernel_version: string; specification_version: string };
  const specRaw = fs.readFileSync(SPEC_PATH, "utf8");
  const spec = parse(specRaw) as { specification_version: string; kernel_version: string };
  // Version check
  if (core.kernel_version !== spec.kernel_version) {
    throw new Error(`kernel version mismatch: core ${core.kernel_version} vs spec ${spec.kernel_version}`);
  }
  // Load platform-kernel.yaml for runtime gate
  const { loadPlatformKernel } = (() => {
    // lazy avoid circul
    const m = require("../../../src/platform-kernel.js");
    return m;
  })();
  // This is dynamic - for TS we just re-export
  return { kernel: null, coreVersion: core, specVersion: spec.specification_version };
}

// Re-export existing loader for backwards compat (Strangler)
export * from "../../../src/platform-kernel.js";
export { loadPlatformKernel } from "../../../src/platform-kernel.js";
