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
 *   workspaces/<id>/manifest.yaml    (git-tracked, declarative — per spec)
 *   workspaces/<id>/knowledge/casio.yaml (for casio) or knowledge.yaml (git-tracked, source of truth)
 *   workspaces/<id>/evidence/        (evidence.json — witness + field, git-tracked)
 *   workspaces/<id>/feedback/        (intake.json)
 *   workspaces/<id>/registries/      (version-proposals.json, audit-events.json)
 *   data/workspaces/<id>/            (runtime mirrors — gitignored)
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

export const domainSchema = z.object({
  domain_id: z.string().regex(/^[a-z0-9_]+$/),
  domain_name: z.string().min(1),
  owner_id: z.string().min(1),
  status: z.enum(["needs_definition", "field_discovery_required", "active", "mature"]).default("needs_definition"),
  evidence_count: z.number().int().min(0).default(0),
  playbook_count: z.number().int().min(0).default(0),
});

export type WorkspaceDomain = z.infer<typeof domainSchema>;

export const manifestSchema = z.object({
  workspace_id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  organization_id: z.string().min(1),
  display_name: z.string().optional(),
  workspace_manifest_version: z.string().default("0.1.0"),
  created_from_kernel_version: z.string().default("0.1.0"),
  created_from_specification_version: z.string().default("0.5.0"),
  bootstrap_protocol_version: z.string().default("0.1.0"),
  bootstrap_run_id: z.string().optional(),
  created_at: z.string().datetime().optional(),
  installer_id: z.string().optional(),
  workspace_owner_id: z.string().optional(),
  status: z.enum(["bootstrapped_empty", "field_discovery", "evidence_collecting", "reviewing", "operationalizing", "automation_ready", "archived", "forming", "mature"]).default("bootstrapped_empty"),
  channel: z.enum(["experimental", "stable", "beta"]).default("experimental").optional(),
  convergence_opt_in: z.boolean().default(false).optional(),
  domains: z.array(domainSchema).default([]),
  enabled_mcp_tool_levels: z.array(z.number().int().min(0).max(4)).default([0, 1]),
  disabled_capabilities: z.array(z.string()).default([]),
  audit_log_enabled: z.boolean().default(true),
  data_quality_gate_enabled: z.boolean().default(true),
  bootstrap: bootstrapStatusSchema.optional(),
  knowledge_path: z.string().optional(),
  data_dir: z.string().optional(),
});

export type WorkspaceManifest = z.infer<typeof manifestSchema>;

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
  manifest?: WorkspaceManifest;
  manifestPathAbs?: string;
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

function resolveDataDir(config: WorkspaceConfig, dir: string): string {
  const value = config.dataDir.replace("{id}", config.id);
  return path.resolve(dir, value);
}

// ---------------------------------------------------------------------------
// Manifest helpers
// ---------------------------------------------------------------------------

export function loadWorkspaceManifest(id: string, baseDir = workspacesDir()): WorkspaceManifest | undefined {
  const file = path.join(baseDir, id, "manifest.yaml");
  if (!fs.existsSync(file)) return undefined;
  const raw = fs.readFileSync(file, "utf8");
  const parsed: unknown = parse(raw);
  const result = manifestSchema.safeParse(parsed);
  if (!result.success) throw new Error(`workspace_manifest_invalid:${id}: ${result.error.message}`);
  return result.data;
}

export function writeWorkspaceManifest(id: string, manifest: WorkspaceManifest, baseDir = workspacesDir()): void {
  const file = path.join(baseDir, id, "manifest.yaml");
  fs.writeFileSync(file, stringify(manifest), "utf8");
}

export function listDomains(ws: Workspace): WorkspaceDomain[] {
  if (ws.manifest?.domains) return ws.manifest.domains;
  return [];
}

export function checkKernelCompatibility(ws: Workspace): { compatible: boolean; warning?: string } {
  const kernelVersion = "0.1.0"; // from core/VERSION
  const created = ws.manifest?.created_from_kernel_version;
  if (!created) return { compatible: true };
  if (created === kernelVersion) return { compatible: true };
  // best_effort: minor change warning, major requires migration plan
  const [maj1] = kernelVersion.split(".").map(Number);
  const [maj2] = (created ?? "").split(".").map(Number);
  if (maj1 !== maj2) {
    return { compatible: false, warning: `kernel major version mismatch: workspace ${created} vs kernel ${kernelVersion} — migration plan required` };
  }
  return { compatible: true, warning: `kernel version drift: workspace ${created} vs kernel ${kernelVersion} — best_effort` };
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
  const manifest = loadWorkspaceManifest(id, baseDir);
  const manifestPathAbs = manifest ? path.join(dir, "manifest.yaml") : undefined;
  return {
    config,
    manifest,
    manifestPathAbs,
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
  fs.mkdirSync(path.join(dir, "evidence"), { recursive: true });
  fs.mkdirSync(path.join(dir, "feedback"), { recursive: true });
  fs.mkdirSync(path.join(dir, "registries"), { recursive: true });
  fs.mkdirSync(path.join(dir, "operations"), { recursive: true });
  const dataDir = defaultDataDirFor(id);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(dataDir, "evidence"), { recursive: true });
  fs.mkdirSync(path.join(dataDir, "feedback"), { recursive: true });
  fs.mkdirSync(path.join(dataDir, "drafts"), { recursive: true });

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

  // Create manifest.yaml per spec (three-layer: workspace manifest)
  const manifest: WorkspaceManifest = {
    workspace_id: id,
    organization_id: id,
    display_name: config.displayName,
    workspace_manifest_version: "0.1.0",
    created_from_kernel_version: "0.1.0",
    created_from_specification_version: "0.5.0",
    bootstrap_protocol_version: "0.1.0",
    bootstrap_run_id: `bootstrap_${new Date().toISOString().slice(0, 10).replace(/-/g, "_")}_001`,
    created_at: config.createdAt,
    installer_id: "system_igniter_001",
    workspace_owner_id: "system_igniter_001",
    status: "bootstrapped_empty",
    domains: [],
    enabled_mcp_tool_levels: [0, 1],
    disabled_capabilities: ["automation", "external_publish", "financial_action"],
    audit_log_enabled: true,
    data_quality_gate_enabled: true,
    bootstrap: config.bootstrap,
    knowledge_path: "knowledge.yaml",
    data_dir: dataDir,
  };
  fs.writeFileSync(path.join(dir, "manifest.yaml"), stringify(manifest), "utf8");

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
  // .gitkeep for evidence/feedback
  fs.writeFileSync(path.join(dir, "evidence", ".gitkeep"), "", "utf8");
  fs.writeFileSync(path.join(dir, "feedback", ".gitkeep"), "", "utf8");
  fs.writeFileSync(path.join(dir, "registries", ".gitkeep"), "", "utf8");
  fs.writeFileSync(path.join(dir, "operations", ".gitkeep"), "", "utf8");

  return loadWorkspace(id, baseDir);
}

// ---------------------------------------------------------------------------
// Domain management (Level 0: define_domain, assign_owner)
// ---------------------------------------------------------------------------

export function defineDomain(
  workspaceId: string,
  domain: { domain_id: string; domain_name: string; owner_id?: string; status?: WorkspaceDomain["status"] },
  baseDir = workspacesDir(),
): WorkspaceManifest {
  const ws = loadWorkspace(workspaceId, baseDir);
  if (!ws.manifest) throw new Error(`workspace_manifest_not_found:${workspaceId}`);
  const id = domain.domain_id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (!id) throw new Error("domain_id_invalid");
  if (ws.manifest.domains.some((d) => d.domain_id === id)) {
    throw new Error(`domain_already_exists:${id}`);
  }
  const newDomain: WorkspaceDomain = {
    domain_id: id,
    domain_name: domain.domain_name.trim(),
    owner_id: domain.owner_id?.trim() || "needs_assignment",
    status: (domain.status as WorkspaceDomain["status"]) ?? "needs_definition",
    evidence_count: 0,
    playbook_count: 0,
  };
  const updated: WorkspaceManifest = {
    ...ws.manifest,
    domains: [...ws.manifest.domains, newDomain],
  };
  // update bootstrap status if first domain
  if (updated.domains.length > 0 && updated.bootstrap) {
    updated.bootstrap = { ...updated.bootstrap, domains: "mapped" as const };
  }
  writeWorkspaceManifest(workspaceId, updated, baseDir);
  return updated;
}

export function assignOwner(
  workspaceId: string,
  domainId: string,
  ownerId: string,
  baseDir = workspacesDir(),
): WorkspaceManifest {
  const ws = loadWorkspace(workspaceId, baseDir);
  if (!ws.manifest) throw new Error(`workspace_manifest_not_found:${workspaceId}`);
  const idx = ws.manifest.domains.findIndex((d) => d.domain_id === domainId);
  if (idx < 0) throw new Error(`domain_not_found:${domainId}`);
  const updatedDomains = [...ws.manifest.domains];
  updatedDomains[idx] = { ...updatedDomains[idx], owner_id: ownerId.trim() };
  const updated: WorkspaceManifest = { ...ws.manifest, domains: updatedDomains };
  writeWorkspaceManifest(workspaceId, updated, baseDir);
  return updated;
}

// ---------------------------------------------------------------------------
// Readiness + capability gate (Automation = result of maturity)
// ---------------------------------------------------------------------------

const EVIDENCE_FORMING = 3;
const EVIDENCE_MATURE = 10;

/** Real field evidence = approved feedback records + accepted evidence in the workspace. */
export function evidenceCount(ws: Workspace): number {
  const seenFeedback = new Set<string>();
  let count = 0;
  const feedbackFiles = [
    path.join(ws.dataDirAbs, "feedback-intake.json"),
    path.join(ws.dir, "feedback", "intake.json"),
  ];
  for (const ff of feedbackFiles) {
    if (fs.existsSync(ff)) {
      try {
        const raw: unknown = JSON.parse(fs.readFileSync(ff, "utf8"));
        if (Array.isArray(raw)) {
          for (const r of raw as { id?: string; reviewStatus?: string }[]) {
            if (r.reviewStatus === "approved" && r.id && !seenFeedback.has(r.id)) {
              seenFeedback.add(r.id);
              count++;
            } else if (r.reviewStatus === "approved" && !r.id) {
              count++;
            }
          }
        }
      } catch {}
    }
  }
  const seenEvidence = new Set<string>();
  const evidenceFiles = [
    path.join(ws.dataDirAbs, "evidence.json"),
    path.join(ws.dataDirAbs, "evidence", "evidence.json"),
    path.join(ws.dir, "evidence", "evidence.json"),
  ];
  for (const ef of evidenceFiles) {
    if (fs.existsSync(ef)) {
      try {
        const raw: unknown = JSON.parse(fs.readFileSync(ef, "utf8"));
        if (Array.isArray(raw)) {
          for (const r of raw as { evidence_id?: string; id?: string; review_status?: string }[]) {
            const key = r.evidence_id ?? r.id ?? JSON.stringify(r);
            if ((r.review_status === "accepted" || r.review_status === "converted_to_proposal") && !seenEvidence.has(key)) {
              seenEvidence.add(key);
            }
          }
        }
      } catch {}
    }
  }
  count += seenEvidence.size;
  return count;
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
const TOOL_LEVEL: Record<string, number> = {
  create_workspace: 0,
  define_domain: 0,
  assign_owner: 0,
  create_asset_from_template: 0,
  create_registry_schema: 0,
  search_playbooks: 0,
  get_playbook: 0,
  get_architecture: 0,
  get_learning_path: 0,
  list_review_queue: 0,
  list_version_proposals: 0,
  list_audit_events: 0,
  list_workspaces: 0,
  workspace_readiness: 0,
  list_evidence: 0,
  capture_field_observation: 1,
  validate_record: 1,
  submit_feedback_intake: 1,
  review_feedback: 2,
  review_proposal: 2,
  create_version_proposal: 2,
  approve_asset: 3,
  publish_internal_playbook: 3,
  sync_to_task_tool: 3,
  review_evidence: 2,
  execute_approved_automation: 4,
  execute_automation: 4,
  approve_high_risk_action: 4,
  publish_external_content: 4,
  mutate_crm: 4,
  financial_action: 4,
  emit_convergence_pattern: 2,
  list_convergence_reports: 0,
  review_convergence_report: 2,
  promote_workspace_channel: 3,
  publish_kernel_release_record: 3,
};

export function canEnableTool(ws: Workspace, tool: string): { enabled: boolean; reason?: string } {
  const kernel = loadPlatformKernel();
  // For tools gated by evidence (Level 4 dangerous), only evidence threshold matters, not manifest level
  // This preserves Strangler compatibility: new workspace with [0,1] still unlocks after 3 evidences in tests
  const isEvidenceGated = kernel.disabled_until_evidence.includes(tool) || TOOL_LEVEL[tool] === 4;
  if (isEvidenceGated) {
    const readiness = workspaceReadiness(ws);
    if (readiness === "bootstrap") {
      return {
        enabled: false,
        reason: `tool_disabled_until_evidence:${tool} — workspace «${ws.config.displayName}» has no approved field evidence yet (readiness: bootstrap)`,
      };
    }
    return { enabled: true, reason: `enabled_at_readiness:${readiness}` };
  }
  // Manifest level gate — per spec enabled_mcp_tool_levels (for non-evidence-gated tools)
  const level = TOOL_LEVEL[tool];
  if (level !== undefined && ws.manifest?.enabled_mcp_tool_levels) {
    if (!ws.manifest.enabled_mcp_tool_levels.includes(level)) {
      return { enabled: false, reason: `tool_disabled_by_manifest_level:${tool} level ${level} not in enabled_mcp_tool_levels [${ws.manifest.enabled_mcp_tool_levels.join(",")}]` };
    }
  }
  if (kernel.bootstrap_tools_enabled.includes(tool)) return { enabled: true };
  // also allow tools defined in core/mcp/tools.yaml that are not in kernel lists but have level 0-3
  const alwaysAllowed = new Set([
    "define_domain",
    "assign_owner",
    "capture_field_observation",
    "create_version_proposal",
    "review_proposal",
    "approve_asset",
    "publish_internal_playbook",
    "sync_to_task_tool",
    "list_audit_events",
    "list_version_proposals",
    "list_review_queue",
    "list_workspaces",
    "workspace_readiness",
    "list_evidence",
    "review_evidence",
    "create_registry_schema",
    "search_playbooks",
    "get_playbook",
    "get_architecture",
    "get_learning_path",
    "validate_record",
    "submit_feedback_intake",
  ]);
  if (alwaysAllowed.has(tool)) return { enabled: true };
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
    domains: ws.manifest?.domains ?? [],
    manifestVersion: ws.manifest?.workspace_manifest_version ?? null,
    workspaceStatus: ws.manifest?.status ?? null,
  };
}

/** Load knowledge for a workspace (or undefined when the vessel is empty). */
export function loadWorkspaceKnowledge(ws: Workspace): unknown {
  if (!fs.existsSync(ws.knowledgePathAbs)) return undefined;
  return parse(fs.readFileSync(ws.knowledgePathAbs, "utf8"));
}
