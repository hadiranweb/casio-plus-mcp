import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { loadPlatformKernel, loadKernelTools, loadEcosystemSpec, type ToolLevel } from "./platform-kernel.js";
import { evidenceAcceptedCount } from "./evidence-store.js";

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
 *   workspaces/<id>/config.json     (git-tracked, machine-readable)
 *   workspaces/<id>/manifest.yaml   (git-tracked, the identity per spec)
 *   workspaces/<id>/knowledge.yaml  (git-tracked, the org's source of truth)
 *   data/workspaces/<id>/           (runtime state — evidence, feedback, audit)
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

const domainDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ownerId: z.string().optional(),
  status: z.enum(["needs_definition", "field_discovery_required", "defined"]).default("needs_definition"),
  evidenceCount: z.number().int().min(0).default(0),
  playbookCount: z.number().int().min(0).default(0),
});
export type DomainDef = z.infer<typeof domainDefSchema>;

export const workspaceConfigSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "workspace id must be a lowercase slug"),
  displayName: z.string().min(1),
  status: z.enum(["active", "archived"]).default("active"),
  ownerId: z.string().optional(),
  /** Relative to the workspace dir. Defaults: knowledge.yaml. */
  knowledgePath: z.string().default("knowledge.yaml"),
  /** Absolute or relative path to runtime state (gitignored). */
  dataDir: z.string(),
  /** MCP tool levels enabled for this workspace (0-4). */
  enabledToolLevels: z.array(z.number().int().min(0).max(4)).default([0, 1, 2, 3, 4]),
  domains: z.array(domainDefSchema).default([]),
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
// Manifest (workspaces/<id>/manifest.yaml — the identity per spec)
// ---------------------------------------------------------------------------

const workspaceManifestSchema = z.object({
  workspace_id: z.string().min(1),
  organization_id: z.string().min(1),
  workspace_manifest_version: z.string().min(1),
  created_from_kernel_version: z.string().min(1),
  created_from_specification_version: z.string().min(1),
  bootstrap_protocol_version: z.string().min(1),
  bootstrap_run_id: z.string().min(1),
  created_at: z.string().datetime(),
  installer_id: z.string().min(1),
  workspace_owner_id: z.string().optional(),
  status: z.enum(["bootstrapped_empty", "field_discovery", "evidence_collecting", "operational", "mature"]),
  domains: z.array(z.object({
    domain_id: z.string().min(1),
    domain_name: z.string().min(1),
    owner_id: z.string().optional(),
    status: z.string(),
    evidence_count: z.number().int().min(0),
    playbook_count: z.number().int().min(0),
  })).default([]),
  enabled_mcp_tool_levels: z.array(z.number().int().min(0).max(4)).default([0]),
  disabled_capabilities: z.array(z.string()).default(["automation", "external_publish", "financial_action"]),
  audit_log_enabled: z.boolean().default(true),
  data_quality_gate_enabled: z.boolean().default(true),
});

export type WorkspaceManifest = z.infer<typeof workspaceManifestSchema>;

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

export function workspaceManifestPath(id: string): string {
  return path.join(workspaceDir(id), "manifest.yaml");
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
    dataDirAbs: path.resolve(dir, config.dataDir),
  };
}

export function loadWorkspaceManifest(id: string, baseDir = workspacesDir()): WorkspaceManifest | undefined {
  const file = path.join(baseDir, id, "manifest.yaml");
  if (!fs.existsSync(file)) return undefined;
  const parsed = parse(fs.readFileSync(file, "utf8"));
  const result = workspaceManifestSchema.safeParse(parsed);
  if (!result.success) throw new Error(`workspace_manifest_invalid:${id}: ${result.error.message}`);
  return result.data;
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

function saveConfig(ws: Workspace): void {
  fs.writeFileSync(path.join(ws.dir, "config.json"), `${JSON.stringify(ws.config, null, 2)}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// Bootstrap — the "System Igniter": create an empty-but-guided workspace
// ---------------------------------------------------------------------------

export type BootstrapInput = {
  id: string;
  displayName: string;
  ownerId?: string;
};

/**
 * Bootstrap a new workspace. Creates the guided empty structure (config with
 * needs-definition statuses + an empty knowledge vessel) and the runtime data
 * dir, plus the spec-shaped manifest.yaml identity. Creates NO fake content.
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
    ownerId: input.ownerId,
    knowledgePath: "knowledge.yaml",
    dataDir,
    enabledToolLevels: [0, 1, 2, 3, 4],
    domains: [],
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

  // The identity per the General Ecosystem Spec.
  const kernel = loadPlatformKernel();
  const spec = loadEcosystemSpec();
  const manifest: WorkspaceManifest = {
    workspace_id: id,
    organization_id: input.displayName.trim(),
    workspace_manifest_version: "0.1.0",
    created_from_kernel_version: `0.${kernel.version}.0`,
    created_from_specification_version: spec.spec_version,
    bootstrap_protocol_version: "0.1.0",
    bootstrap_run_id: `bootstrap_${new Date().toISOString().slice(0, 10).replace(/-/g, "_")}_${id}`,
    created_at: new Date().toISOString(),
    installer_id: "system_igniter",
    workspace_owner_id: input.ownerId,
    status: "bootstrapped_empty",
    domains: [],
    enabled_mcp_tool_levels: [0, 1],
    disabled_capabilities: ["automation", "external_publish", "financial_action"],
    audit_log_enabled: true,
    data_quality_gate_enabled: true,
  };
  fs.writeFileSync(path.join(dir, "manifest.yaml"), stringify(manifest), "utf8");

  return loadWorkspace(id, baseDir);
}

// ---------------------------------------------------------------------------
// Domains + owners (Level 0 tools)
// ---------------------------------------------------------------------------

/** Level 0 tool: define a domain on a workspace (status needs_definition). */
export function defineDomain(
  ws: Workspace,
  input: { domainId: string; domainName: string; ownerId?: string },
): Workspace {
  const domainId = input.domainId.trim();
  if (!domainId) throw new Error("domain_id_required");
  const existing = ws.config.domains.find((d) => d.id === domainId);
  const domain: DomainDef = {
    id: domainId,
    name: input.domainName.trim(),
    ownerId: input.ownerId,
    status: existing?.status ?? "needs_definition",
    evidenceCount: existing?.evidenceCount ?? 0,
    playbookCount: existing?.playbookCount ?? 0,
  };
  const domains = existing ? ws.config.domains.map((d) => (d.id === domainId ? domain : d)) : [...ws.config.domains, domain];
  ws.config.domains = domains;
  ws.config.bootstrap.domains = "mapped";
  saveConfig(ws);
  return ws;
}

/** Level 0 tool: assign an owner to a domain (or the workspace). */
export function assignOwner(
  ws: Workspace,
  input: { ownerId: string; domainId?: string },
): Workspace {
  const ownerId = input.ownerId.trim();
  if (!ownerId) throw new Error("owner_id_required");
  if (input.domainId) {
    const domain = ws.config.domains.find((d) => d.id === input.domainId);
    if (!domain) throw new Error(`domain_not_found:${input.domainId}`);
    ws.config.domains = ws.config.domains.map((d) => (d.id === input.domainId ? { ...d, ownerId } : d));
  } else {
    ws.config.ownerId = ownerId;
  }
  saveConfig(ws);
  return ws;
}

// ---------------------------------------------------------------------------
// Readiness + capability gate (Automation = result of maturity)
// ---------------------------------------------------------------------------

const EVIDENCE_FORMING = 3;
const EVIDENCE_MATURE = 10;

/**
 * Real field evidence = approved feedback records + accepted evidence records
 * in the workspace.
 */
export function evidenceCount(ws: Workspace): number {
  const file = path.join(ws.dataDirAbs, "feedback-intake.json");
  let approvedFeedback = 0;
  if (fs.existsSync(file)) {
    try {
      const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(raw)) {
        approvedFeedback = raw.filter((r) => (r as { reviewStatus?: string }).reviewStatus === "approved").length;
      }
    } catch {
      // ignore malformed runtime file
    }
  }
  return approvedFeedback + evidenceAcceptedCount(ws);
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
 * The bootstrap capability gate:
 *   1. the tool must be a known contract in core/mcp/tools.yaml;
 *   2. its level must be ≤ the workspace's enabledToolLevels;
 *   3. tools in `disabled_until_evidence` stay off until the workspace has
 *      real evidence (forming = ≥3 approved field records/evidence).
 */
export function canEnableTool(ws: Workspace, tool: string): { enabled: boolean; reason?: string } {
  const kernel = loadPlatformKernel();
  const tools = loadKernelTools();
  const meta = tools.get(tool);
  if (!meta) {
    if (kernel.bootstrap_tools_enabled.includes(tool)) return { enabled: true };
    return { enabled: false, reason: `unknown_tool:${tool}` };
  }
  const maxLevel = Math.max(...ws.config.enabledToolLevels);
  if (meta.level > maxLevel) {
    return {
      enabled: false,
      reason: `tool_level_gated:${tool} requires level ${meta.level}, workspace «${ws.config.displayName}» max is ${maxLevel}`,
    };
  }
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
  return { enabled: true };
}

/** Summary used by list_workspaces / workspace_readiness. */
export function workspaceSummary(ws: Workspace) {
  const evidence = evidenceCount(ws);
  const tools = loadKernelTools();
  const enabledTools = [...tools.keys()].filter((tool) => canEnableTool(ws, tool).enabled);
  return {
    id: ws.config.id,
    displayName: ws.config.displayName,
    ownerId: ws.config.ownerId ?? null,
    status: ws.config.status,
    readiness: workspaceReadiness(ws),
    evidenceCount: evidence,
    enabledToolLevels: ws.config.enabledToolLevels,
    domains: ws.config.domains,
    bootstrap: ws.config.bootstrap,
    enabledTools,
  };
}

/** Load knowledge for a workspace (or undefined when the vessel is empty). */
export function loadWorkspaceKnowledge(ws: Workspace): unknown {
  if (!fs.existsSync(ws.knowledgePathAbs)) return undefined;
  return parse(fs.readFileSync(ws.knowledgePathAbs, "utf8"));
}
