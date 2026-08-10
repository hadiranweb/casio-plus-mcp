import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { loadPlatformKernel } from "./platform-kernel.js";

/**
 * Workspace — the bootstrap layer of the Element Ecosystem.
 *
 * A workspace is a living-but-guided empty structure for one organization /
 * brand. It is NOT a fake organization: playbooks start as `templates_only`
 * draft vessels, owners are null, evidence is 0, automation is off. The
 * organization fills the workspace with real field evidence over time; the
 * readiness of the workspace gates which MCP tools are allowed.
 *
 * Layout:
 *   workspaces/<id>/config.json      (git-tracked, declarative)
 *   workspaces/<id>/knowledge.yaml   (git-tracked, the org's source of truth)
 *   data/workspaces/<id>/            (runtime state — feedback, audit, proposals)
 *
 * For the built-in casio workspace, knowledge stays at knowledge/casio.yaml
 * (the existing source of truth) — config just points at it.
 */

// ---------------------------------------------------------------------------
// Config schema
// ---------------------------------------------------------------------------

const bootstrapStatusSchema = z.object({
  organization_profile: z.enum(["needs_definition", "defined"]).default("needs_definition"),
  domains: z.enum(["empty_structure", "mapped"]).default("empty_structure"),
  knowledge_map: z.enum(["empty_graph", "growing", "mature"]).default("empty_graph"),
  playbooks: z.enum(["templates_only", "evidence_based", "mature"]).default("templates_only"),
  data_registers: z.enum(["schema_only", "populated"]).default("schema_only"),
  workflows: z.enum(["needs_field_discovery", "discovered", "automated"]).default("needs_field_discovery"),
  automation_specs: z.enum(["disabled_until_approved", "enabled"]).default("disabled_until_approved"),
  feedback_intake: z.enum(["ready", "active", "mature"]).default("ready"),
  review_queue: z.enum(["ready", "active"]).default("ready"),
});

export type WorkspaceBootstrapStatus = z.infer<typeof bootstrapStatusSchema>;

export const workspaceConfigSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "workspace id must be a lowercase slug"),
  displayName: z.string().min(1),
  status: z.enum(["active", "archived"]).default("active"),
  /** Relative to the workspace dir. Defaults: knowledge.yaml. */
  knowledgePath: z.string().default("knowledge.yaml"),
  /** Relative to the workspace dir; runtime state lives here. */
  dataDir: z.string().default("../../data/workspaces/{id}"),
  bootstrap: bootstrapStatusSchema.default({}),
  createdAt: z.string().datetime(),
});

export type WorkspaceConfig = z.infer<typeof workspaceConfigSchema>;

export type Workspace = {
  config: WorkspaceConfig;
  dir: string;
  knowledgePathAbs: string;
  dataDirAbs: string;
};

export type WorkspaceReadiness = "bootstrap" | "forming" | "mature";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_WORKSPACES_DIR = path.resolve(moduleDir, "../workspaces");

export function workspacesDir(): string {
  return process.env.CASIO_WORKSPACES_DIR ?? DEFAULT_WORKSPACES_DIR;
}

export function workspaceDir(id: string): string {
  return path.join(workspacesDir(), id);
}

export function workspaceConfigPath(id: string): string {
  return path.join(workspaceDir(id), "config.json");
}

/** Runtime data root for all workspaces (gitignored). Overridable for tests. */
export function workspacesDataRoot(): string {
  return (
    process.env.CASIO_WORKSPACES_DATA_DIR ??
    path.resolve(workspacesDir(), "../data/workspaces")
  );
}

export function defaultDataDirFor(id: string): string {
  return path.join(workspacesDataRoot(), id);
}

function resolveDataDir(config: WorkspaceConfig, dir: string): string {
  const value = config.dataDir.replace("{id}", config.id);
  return path.resolve(dir, value);
}

// ---------------------------------------------------------------------------
// Load / list
// ---------------------------------------------------------------------------

export function loadWorkspaceConfig(id: string, baseDir = workspacesDir()): WorkspaceConfig {
  const file = path.join(baseDir, id, "config.json");
  if (!fs.existsSync(file)) throw new Error(`workspace_not_found:${id}`);
  const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  const result = workspaceConfigSchema.safeParse(parsed);
  if (!result.success) throw new Error(`workspace_config_invalid:${id}: ${result.error.message}`);
  return result.data;
}

export function loadWorkspace(id: string, baseDir = workspacesDir()): Workspace {
  const config = loadWorkspaceConfig(id, baseDir);
  const dir = path.join(baseDir, id);
  return {
    config,
    dir,
    knowledgePathAbs: path.resolve(dir, config.knowledgePath),
    dataDirAbs: resolveDataDir(config, dir),
  };
}

export function listWorkspaces(baseDir = workspacesDir()): Workspace[] {
  if (!fs.existsSync(baseDir)) return [];
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => fs.existsSync(path.join(baseDir, id, "config.json")))
    .map((id) => loadWorkspace(id, baseDir))
    .sort((a, b) => a.config.id.localeCompare(b.config.id));
}

export function getWorkspace(id: string, baseDir = workspacesDir()): Workspace | undefined {
  try {
    return loadWorkspace(id, baseDir);
  } catch {
    return undefined;
  }
}

export function defaultWorkspaceId(): string {
  return process.env.CASIO_WORKSPACE ?? "casio";
}

// ---------------------------------------------------------------------------
// Bootstrap — the "System Igniter": create an empty-but-guided workspace
// ---------------------------------------------------------------------------

export type BootstrapInput = {
  id: string;
  displayName: string;
};

/**
 * Bootstrap a new workspace. Creates the guided empty structure (config with
 * needs-definition statuses + an empty knowledge vessel) and the runtime data
 * dir. Creates NO fake content: playbooks are templates-only, owners null.
 */
export function bootstrapWorkspace(input: BootstrapInput, baseDir = workspacesDir()): Workspace {
  const id = input.id.trim().toLowerCase();
  if (!workspaceConfigSchema.shape.id.safeParse(id).success) {
    throw new Error("workspace_id_invalid: use a lowercase slug like 'acme'");
  }
  const dir = path.join(baseDir, id);
  if (fs.existsSync(path.join(dir, "config.json"))) {
    throw new Error(`workspace_already_exists:${id}`);
  }
  fs.mkdirSync(path.join(dir, "knowledge"), { recursive: true });
  const dataDir = defaultDataDirFor(id);
  fs.mkdirSync(dataDir, { recursive: true });

  const config: WorkspaceConfig = {
    id,
    displayName: input.displayName.trim(),
    status: "active",
    knowledgePath: "knowledge.yaml",
    dataDir,
    bootstrap: bootstrapStatusSchema.parse({}),
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dir, "config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");

  // The knowledge vessel: a guided empty document, not fake knowledge.
  const vessel = {
    meta: {
      brand: config.displayName,
      version: "0.0.0",
      status: "needs_definition",
    },
    note: "این حافظه با شواهد واقعی میدان ساخته می‌شود؛ هنوز محتوایی ادعا نشده است.",
  };
  fs.writeFileSync(path.join(dir, "knowledge.yaml"), stringify(vessel), "utf8");

  return loadWorkspace(id, baseDir);
}

// ---------------------------------------------------------------------------
// Readiness + capability gate (Automation = result of maturity)
// ---------------------------------------------------------------------------

const EVIDENCE_FORMING = 3;
const EVIDENCE_MATURE = 10;

/** Real field evidence = approved feedback records in the workspace queue. */
export function evidenceCount(ws: Workspace): number {
  const file = path.join(ws.dataDirAbs, "feedback-intake.json");
  if (!fs.existsSync(file)) return 0;
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(raw)) return 0;
    return raw.filter((r) => (r as { reviewStatus?: string }).reviewStatus === "approved").length;
  } catch {
    return 0;
  }
}

export function readinessFor(evidence: number): WorkspaceReadiness {
  if (evidence >= EVIDENCE_MATURE) return "mature";
  if (evidence >= EVIDENCE_FORMING) return "forming";
  return "bootstrap";
}

export function workspaceReadiness(ws: Workspace): WorkspaceReadiness {
  return readinessFor(evidenceCount(ws));
}

/**
 * The bootstrap capability gate: tools in `disabled_until_evidence` stay off
 * until the workspace has real evidence (forming = ≥3 approved field records).
 * Everything else from the kernel's enabled list is allowed.
 */
export function canEnableTool(ws: Workspace, tool: string): { enabled: boolean; reason?: string } {
  const kernel = loadPlatformKernel();
  if (kernel.disabled_until_evidence.includes(tool)) {
    const readiness = workspaceReadiness(ws);
    if (readiness === "bootstrap") {
      return {
        enabled: false,
        reason: `tool_disabled_until_evidence:${tool} — workspace «${ws.config.displayName}» has no approved field evidence yet (readiness: bootstrap)`,
      };
    }
    return { enabled: true, reason: `enabled_at_readiness:${readiness}` };
  }
  if (kernel.bootstrap_tools_enabled.includes(tool)) return { enabled: true };
  return { enabled: false, reason: `unknown_tool:${tool}` };
}

/** Summary used by list_workspaces / workspace_readiness. */
export function workspaceSummary(ws: Workspace) {
  const evidence = evidenceCount(ws);
  const kernel = loadPlatformKernel();
  const enabledTools = [...kernel.bootstrap_tools_enabled, ...kernel.disabled_until_evidence].filter(
    (tool) => canEnableTool(ws, tool).enabled,
  );
  return {
    id: ws.config.id,
    displayName: ws.config.displayName,
    status: ws.config.status,
    readiness: workspaceReadiness(ws),
    evidenceCount: evidence,
    bootstrap: ws.config.bootstrap,
    enabledTools,
  };
}

/** Load knowledge for a workspace (or undefined when the vessel is empty). */
export function loadWorkspaceKnowledge(ws: Workspace): unknown {
  if (!fs.existsSync(ws.knowledgePathAbs)) return undefined;
  return parse(fs.readFileSync(ws.knowledgePathAbs, "utf8"));
}
