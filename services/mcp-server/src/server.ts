import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { feedbackInputSchema, validateFeedback } from "./quality.js";
import { loadPlatformKernel } from "./platform-kernel.js";
import {
  assertToolEnabled,
  assignOwner,
  bootstrapWorkspace,
  canEnableTool,
  defaultWorkspaceId,
  defineDomain,
  getWorkspace,
  listWorkspaces,
  loadWorkspace,
  loadWorkspaceManifest,
  workspaceReadiness,
  workspaceSummary,
  wsStorePaths,
} from "./workspace.js";
import { captureEvidence, listEvidence, triageEvidence } from "./evidence-store.js";
import { createAssetFromTemplate, saveDraftAsset } from "./templates.js";
import { workspaceReceptors } from "./receptors.js";
import { attachProposalToFeedback, listFeedbackQueue, reviewFeedback, submitFeedback } from "./intake-store.js";
import { listAuditEvents, recordAuditEvent } from "./audit-store.js";
import { createVersionProposal, listVersionProposals } from "./proposal-store.js";
import { getPlaybook, loadKnowledge, searchPlaybooks } from "./knowledge-store.js";

/**
 * Element Ecosystem — the MCP server of the organism.
 *
 * The server is the Synaptic Hub: every request carries (or defaults to) a
 * workspace id, is routed to that island's receptors, validated, audited and
 * measured. The kernel itself is brand-agnostic; each workspace supplies its
 * own knowledge and runtime stores.
 */

const server = new McpServer({
  name: "element-ecosystem",
  version: "0.2.0",
});

function json(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

/** Cache parsed knowledge per workspace so repeated calls stay cheap. */
const knowledgeCache = new Map<string, unknown>();
function knowledgeFor(workspaceId: string): unknown {
  const ws = getWorkspace(workspaceId);
  if (!ws) throw new Error(`workspace_not_found:${workspaceId}`);
  if (!knowledgeCache.has(ws.config.id)) {
    knowledgeCache.set(ws.config.id, loadKnowledge(ws.knowledgePathAbs));
  }
  return knowledgeCache.get(ws.config.id)!;
}

const workspaceParam = {
  workspace: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .optional()
    .describe("شناسهٔ workspace (جزیره)؛ پیش‌فرض از CASIO_WORKSPACE یا «casio»"),
};

function resolveWorkspace(workspace?: string): string {
  return workspace ?? defaultWorkspaceId();
}

// ---------------------------------------------------------------------------
// Resources (default workspace)
// ---------------------------------------------------------------------------

server.registerResource(
  "casio-knowledge-summary",
  "casio://knowledge/summary",
  {
    title: "خلاصهٔ دانش workspace پیش‌فرض",
    description: "نسخه، اسپرینت و آمار پلی‌بوک‌های workspace جاری.",
    mimeType: "application/json",
  },
  async (uri) => {
    const knowledge = knowledgeFor(defaultWorkspaceId()) as {
      meta?: Record<string, unknown>;
      دارایی_ها?: { پلی_بوک_ها?: unknown[] };
    };
    const summary = {
      version: knowledge.meta ?? {},
      playbookCount: knowledge.دارایی_ها?.پلی_بوک_ها?.length ?? 0,
    };
    return {
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(summary, null, 2) }],
    };
  },
);

server.registerResource(
  "casio-playbook",
  new ResourceTemplate("casio://playbooks/{id}", { list: undefined }),
  {
    title: "پلی‌بوک workspace پیش‌فرض",
    description: "یک پلی‌بوک با مدل داده، وابستگی‌ها و مثال اجرایی.",
    mimeType: "application/json",
  },
  async (uri, variables) => {
    const knowledge = knowledgeFor(defaultWorkspaceId()) as { دارایی_ها: { پلی_بوک_ها: { id: number }[] } };
    const id = Number(variables.id);
    const playbook = getPlaybook(knowledge as never, id);
    if (!playbook) throw new Error(`Playbook not found: ${variables.id}`);
    return {
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(playbook, null, 2) }],
    };
  },
);

// ---------------------------------------------------------------------------
// Bootstrap tools (System Igniter)
// ---------------------------------------------------------------------------

server.registerTool(
  "create_workspace",
  {
    title: "ایجاد Workspace (جزیره) — استارت خالی اما هدایت‌شده",
    description:
      "یک workspace جدید برای یک سازمان/برند می‌سازد: ساختار هدایت‌شدهٔ خالی (قالب‌ها فقط، مالک null، شواهد ۰، اتوماسیون خاموش). هیچ محتوای جعلی‌ای نمی‌سازد.",
    inputSchema: {
      id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).describe("شناسهٔ slug مانند acme"),
      displayName: z.string().min(2).describe("نام نمایشی که بالای پلتفرم نشان داده می‌شود"),
      idempotencyKey: z.string().min(8).optional().describe("کلید یکتایی برای idempotent بودن؛ تکرار با همان کلید، workspace موجود را برمی‌گرداند"),
    },
  },
  async ({ id, displayName, idempotencyKey }) => {
    const ws = bootstrapWorkspace({ id, displayName, idempotencyKey });
    return json({
      workspace: workspaceSummary(ws),
      message: `workspace «${displayName}» بوت‌استرپ شد؛ حافظه با شواهد واقعی ساخته می‌شود نه با دادهٔ نمایشی.`,
    });
  },
);

server.registerTool(
  "list_workspaces",
  {
    title: "فهرست Workspace ها",
    description: "همهٔ جزایر (سازمان‌ها/برندها) را با وضعیت، آمادگی، تعداد شواهد و ابزارهای فعال برمی‌گرداند.",
    inputSchema: {},
  },
  async () => json({ count: listWorkspaces().length, workspaces: listWorkspaces().map(workspaceSummary) }),
);

server.registerTool(
  "workspace_readiness",
  {
    title: "آمادگی Workspace",
    description: "سطح بلوغ یک workspace (bootstrap/forming/mature) و ابزارهای فعال/غیرفعال را نشان می‌دهد.",
    inputSchema: workspaceParam,
  },
  async ({ workspace }) => {
    const ws = loadWorkspace(resolveWorkspace(workspace));
    const kernel = loadPlatformKernel();
    const disabled = kernel.disabled_until_evidence.filter((tool) => !canEnableTool(ws, tool).enabled);
    return json({ ...workspaceSummary(ws), disabledUntilEvidence: disabled });
  },
);

server.registerTool(
  "create_asset_from_template",
  {
    title: "ساخت ظرف دارایی از قالب پلتفرم",
    description:
      "یک پیش‌نویس خالی (ظرف) از نوع playbook/template/decision/registry/... می‌سازد؛ مالک null، شواهد ۰ — نه محتوای جعلی.",
    inputSchema: {
      type: z.string().describe("نوع primitive: playbook, template, decision, registry, workflow_map, data_model, automation_spec"),
      title: z.string().describe("عنوان دارایی"),
      workspace: workspaceParam.workspace,
      overrides: z.record(z.unknown()).optional().describe("مقدارهای اختیاری (مثلاً owner)"),
    },
  },
  async ({ type, title, workspace, overrides }) => {
    const ws = loadWorkspace(resolveWorkspace(workspace));
    const asset = createAssetFromTemplate(type, title, { overrides });
    const file = saveDraftAsset(asset, ws.dataDirAbs);
    return json({ asset, draftFile: file, message: "ظرف ساخته شد؛ پر کردنش با شواهد میدان انجام می‌شود." });
  },
);

// ---------------------------------------------------------------------------
// Knowledge tools (routed per workspace)
// ---------------------------------------------------------------------------

server.registerTool(
  "search_playbooks",
  {
    title: "جست‌وجوی پلی‌بوک‌ها",
    description: "پلی‌بوک‌ها را در workspace مشخص‌شده جست‌وجو می‌کند.",
    inputSchema: {
      query: z.string().optional(),
      domain: z.string().optional(),
      role: z.string().optional(),
      level: z.string().optional(),
      assetType: z.string().optional(),
      readiness: z.enum(["داریم", "لازم"]).optional(),
      development: z.boolean().optional(),
      workspace: workspaceParam.workspace,
    },
  },
  async (filters) => {
    const { workspace, ...rest } = filters;
    const knowledge = knowledgeFor(resolveWorkspace(workspace)) as never;
    const results = searchPlaybooks(knowledge, rest);
    return json({ workspace: resolveWorkspace(workspace), count: results.length, playbooks: results });
  },
);

server.registerTool(
  "get_playbook",
  {
    title: "دریافت پلی‌بوک",
    description: "یک پلی‌بوک را با شناسه در workspace مشخص‌شده دریافت می‌کند.",
    inputSchema: {
      id: z.number().int().positive(),
      workspace: workspaceParam.workspace,
    },
  },
  async ({ id, workspace }) => {
    const knowledge = knowledgeFor(resolveWorkspace(workspace)) as never;
    const playbook = getPlaybook(knowledge, id);
    if (!playbook) {
      return { content: [{ type: "text" as const, text: `پلی‌بوک ${id} در workspace «${resolveWorkspace(workspace)}» پیدا نشد.` }], isError: true };
    }
    return json(playbook);
  },
);

server.registerTool(
  "get_architecture",
  {
    title: "دریافت معماری workspace",
    description: "زیرسیستم‌ها و جریان دادهٔ workspace مشخص‌شده را برمی‌گرداند.",
    inputSchema: workspaceParam,
  },
  async ({ workspace }) => {
    const knowledge = knowledgeFor(resolveWorkspace(workspace)) as { معماری?: unknown };
    return json(knowledge.معماری ?? { message: "معماری هنوز در مدل این workspace ثبت نشده است." });
  },
);

server.registerTool(
  "get_learning_path",
  {
    title: "مسیر آموزشی workspace",
    description: "برنامهٔ جلسات، نقش‌ها یا قالب‌های استاندارد workspace را برمی‌گرداند.",
    inputSchema: {
      section: z.enum(["sessions", "roles", "templates", "all"]).default("all"),
      workspace: workspaceParam.workspace,
    },
  },
  async ({ section, workspace }) => {
    const knowledge = knowledgeFor(resolveWorkspace(workspace)) as { آموزش?: Record<string, unknown> };
    const training = knowledge.آموزش ?? {};
    if (section === "sessions") return json({ sessions: (training as never)["برنامه_جلسات"] ?? [] });
    if (section === "roles") return json({ roles: (training as never)["مسیر_نقش_ها"] ?? [] });
    if (section === "templates") return json({ templates: (training as never)["قالب_های_استاندارد"] ?? [] });
    return json(training);
  },
);

// ---------------------------------------------------------------------------
// Feedback + governance tools (routed per workspace via receptors)
// ---------------------------------------------------------------------------

server.registerTool(
  "validate_record",
  {
    title: "اعتبارسنجی رکورد بازخورد",
    description: "رکورد بازخورد میدان را در workspace مشخص‌شده اعتبارسنجی می‌کند؛ چیزی ذخیره نمی‌شود.",
    inputSchema: {
      ...feedbackInputSchema.shape,
      workspace: workspaceParam.workspace,
    },
  },
  async (rawInput) => {
    const { workspace, ...input } = rawInput as typeof rawInput & { workspace?: string };
    const ws = loadWorkspace(resolveWorkspace(workspace));
    const report = validateFeedback(feedbackInputSchema.parse(input), loadKnowledge(ws.knowledgePathAbs) as never);
    return json(report);
  },
);

server.registerTool(
  "submit_feedback_intake",
  {
    title: "ثبت بازخورد در صف بررسی workspace",
    description: "بازخورد میدان را پس از اعتبارسنجی در صف بررسی workspace مشخص‌شده ثبت می‌کند؛ هستهٔ دانش را تغییر نمی‌دهد.",
    inputSchema: {
      ...feedbackInputSchema.shape,
      workspace: workspaceParam.workspace,
    },
  },
  async (rawInput) => {
    const { workspace, ...input } = rawInput as typeof rawInput & { workspace?: string };
    const ws = loadWorkspace(resolveWorkspace(workspace));
    const report = validateFeedback(feedbackInputSchema.parse(input), loadKnowledge(ws.knowledgePathAbs) as never);
    const result = submitFeedback(feedbackInputSchema.parse(input), report, wsStorePaths(ws).intake);
    return json({
      id: result.record.id,
      qualityStatus: result.record.qualityStatus,
      reviewStatus: result.record.reviewStatus,
      duplicateOf: result.duplicateOf ?? null,
      fuzzyDuplicateOf: result.fuzzyDuplicateOf ?? null,
      qualityReport: result.record.qualityReport,
      message: "بازخورد در صف بررسی ثبت شد؛ هستهٔ دانش تغییر نکرده است.",
    });
  },
);

server.registerTool(
  "list_review_queue",
  {
    title: "مشاهده صف بررسی",
    description: "رکوردهای صف بررسی workspace مشخص‌شده را نمایش می‌دهد.",
    inputSchema: {
      qualityStatus: z.enum(["raw", "quarantined", "validated", "rejected"]).optional(),
      reviewStatus: z.enum(["pending_review", "approved", "rejected"]).optional(),
      relatedAssetId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(200).optional(),
      workspace: workspaceParam.workspace,
    },
  },
  async (filters) => {
    const { workspace, ...rest } = filters;
    const ws = loadWorkspace(resolveWorkspace(workspace));
    const records = listFeedbackQueue(rest, wsStorePaths(ws).intake);
    return json({ count: records.length, records });
  },
);

server.registerTool(
  "review_feedback",
  {
    title: "بررسی بازخورد و ساخت پیشنهاد نسخه‌ای",
    description: "بازخورد validated را در workspace مشخص‌شده تأیید/رد می‌کند؛ در تأیید، پیشنهاد نسخه می‌سازد.",
    inputSchema: {
      feedbackId: z.string().min(5),
      decision: z.enum(["approved", "rejected"]),
      reviewer: z.string().min(2),
      reviewNote: z.string().min(10).max(5000),
      workspace: workspaceParam.workspace,
    },
  },
  async ({ feedbackId, decision, reviewer, reviewNote, workspace }) => {
    try {
      const ws = loadWorkspace(resolveWorkspace(workspace));
      assertToolEnabled(ws, "review_feedback");
      const { intake: intakePath, audit: auditPath, proposals: proposalsPath } = wsStorePaths(ws);
      
      
      const feedback = reviewFeedback(feedbackId, decision, reviewer, reviewNote, intakePath);
      const audit = recordAuditEvent({
        action: `feedback_${decision}`,
        actor: reviewer,
        entityType: "feedback",
        entityId: feedback.id,
        details: { relatedAssetId: feedback.relatedAssetId, reviewNote, workspace: ws.config.id },
      }, auditPath);

      if (decision === "rejected") {
        return json({ feedback, audit, proposal: null, message: "بازخورد رد شد؛ هستهٔ دانش تغییر نکرده است." });
      }

      const knowledge = loadKnowledge(ws.knowledgePathAbs) as never;
      const playbook = getPlaybook(knowledge, feedback.relatedAssetId);
      if (!playbook) throw new Error(`Related playbook not found: ${feedback.relatedAssetId}`);
      const proposal = createVersionProposal(
        feedback as never,
        playbook,
        (knowledge as { meta: { نسخه: string } }).meta.نسخه,
        reviewer,
        reviewNote,
        proposalsPath,
      );
      const linked = attachProposalToFeedback(feedback.id, proposal.id, intakePath);
      const proposalAudit = recordAuditEvent({
        action: "version_proposal_created",
        actor: reviewer,
        entityType: "version_proposal",
        entityId: proposal.id,
        details: { feedbackId: feedback.id, relatedAssetId: feedback.relatedAssetId, workspace: ws.config.id },
      }, auditPath);
      return json({
        feedback: linked,
        audit: [audit, proposalAudit],
        proposal,
        message: "بازخورد تأیید شد و پیشنهاد نسخه‌ای برای ادغام انسانی ساخته شد؛ هستهٔ دانش تغییر نکرده است.",
      });
    } catch (error) {
      return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Review failed" }], isError: true };
    }
  },
);

server.registerTool(
  "list_version_proposals",
  {
    title: "مشاهده پیشنهادهای نسخه‌ای",
    description: "پیشنهادهای نسخه‌ای workspace مشخص‌شده را نمایش می‌دهد؛ ادغام همچنان انسانی است.",
    inputSchema: {
      status: z.enum(["pending_human_merge", "merged", "discarded"]).optional(),
      limit: z.number().int().min(1).max(200).optional(),
      workspace: workspaceParam.workspace,
    },
  },
  async ({ status, limit, workspace }) => {
    const ws = loadWorkspace(resolveWorkspace(workspace));
    const proposals = listVersionProposals(status, limit, wsStorePaths(ws).proposals);
    return json({ count: proposals.length, proposals });
  },
);

server.registerTool(
  "list_audit_events",
  {
    title: "مشاهده ردپای ممیزی",
    description: "رویدادهای ممیزی workspace مشخص‌شده را نمایش می‌دهد.",
    inputSchema: {
      limit: z.number().int().min(1).max(200).optional(),
      workspace: workspaceParam.workspace,
    },
  },
  async ({ limit, workspace }) => {
    const ws = loadWorkspace(resolveWorkspace(workspace));
    const events = listAuditEvents(limit, wsStorePaths(ws).audit);
    return json({ count: events.length, events });
  },
);

server.registerTool(
  "assign_owner",
  {
    title: "تعیین مالک (دامنه یا workspace)",
    description: "مالک یک دامنه یا کل workspace را تعیین می‌کند — سطح ۰ (Bootstrap).",
    inputSchema: {
      ownerId: z.string().min(2).describe("شناسه مالک"),
      domainId: z.string().optional().describe("اگر داده شود، مالک دامنه؛ وگرنه مالک workspace"),
      workspace: workspaceParam.workspace,
    },
  },
  async ({ ownerId, domainId, workspace }) => {
    const ws = loadWorkspace(resolveWorkspace(workspace));
    const updated = assignOwner(ws, { ownerId, domainId });
    return json({ workspace: workspaceSummary(updated), message: domainId ? `مالک دامنهٔ ${domainId} تعیین شد.` : "مالک workspace تعیین شد." });
  },
);

server.registerTool(
  "define_domain",
  {
    title: "تعریف دامنه",
    description: "یک دامنه در workspace تعریف می‌کند (وضعیت needs_definition) — سطح ۰ (Bootstrap).",
    inputSchema: {
      domainId: z.string().min(1).describe("شناسه دامنه مانند sales"),
      domainName: z.string().min(2).describe("نام دامنه"),
      ownerId: z.string().optional(),
      workspace: workspaceParam.workspace,
    },
  },
  async ({ domainId, domainName, ownerId, workspace }) => {
    const ws = loadWorkspace(resolveWorkspace(workspace));
    const updated = defineDomain(ws, { domainId, domainName, ownerId });
    return json({ workspace: workspaceSummary(updated), message: `دامنهٔ «${domainName}» تعریف شد (needs_definition).` });
  },
);

server.registerTool(
  "capture_field_observation",
  {
    title: "ثبت مشاهده میدان (Evidence)",
    description: "یک مشاهدهٔ واقعی میدان را به‌عنوان شواهد ثبت می‌کند (unreviewed) — سطح ۱ (Evidence).",
    inputSchema: {
      observer: z.string().min(2),
      summary: z.string().min(5),
      details: z.string().optional(),
      relatedDomain: z.string().min(1),
      source: z.string().optional(),
      confidence: z.number().min(0).max(1).optional(),
      originSystem: z.string().optional(),
      captureMethod: z.string().optional(),
      workspace: workspaceParam.workspace,
    },
  },
  async (input) => {
    const { workspace, ...rest } = input as typeof input & { workspace?: string };
    const ws = loadWorkspace(resolveWorkspace(workspace));
    assertToolEnabled(ws, "capture_field_observation");
    const record = captureEvidence(ws, {
      observer: rest.observer,
      summary: rest.summary,
      details: rest.details,
      related_domain: rest.relatedDomain,
      source: rest.source,
      confidence: rest.confidence,
      origin_system: rest.originSystem,
      capture_method: rest.captureMethod,
    });
    return json({
      evidence: record,
      message: "مشاهده به‌عنوان شواهد ثبت شد؛ برای ورود به حافظه باید triage شود.",
    });
  },
);

server.registerTool(
  "list_evidence",
  {
    title: "فهرست شواهد",
    description: "شواهد ثبت‌شدهٔ workspace را با فیلتر وضعیت/دامنه نمایش می‌دهد — سطح ۱.",
    inputSchema: {
      reviewStatus: z.enum(["unreviewed", "triaged", "accepted", "rejected"]).optional(),
      relatedDomain: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
      workspace: workspaceParam.workspace,
    },
  },
  async ({ reviewStatus, relatedDomain, limit, workspace }) => {
    const ws = loadWorkspace(resolveWorkspace(workspace));
    const records = listEvidence(ws, { reviewStatus, relatedDomain, limit });
    return json({ count: records.length, evidence: records });
  },
);

server.registerTool(
  "triage_evidence",
  {
    title: "بررسی شواهد (پذیرش/رد)",
    description: "یک شواهد unreviewed را پذیرش یا رد می‌کند؛ شواهد پذیرفته‌شده در آمادگی workspace شمرده می‌شود — سطح ۲ (Review).",
    inputSchema: {
      evidenceId: z.string().min(1),
      decision: z.enum(["accepted", "rejected"]),
      by: z.string().min(2),
      workspace: workspaceParam.workspace,
    },
  },
  async ({ evidenceId, decision, by, workspace }) => {
    const ws = loadWorkspace(resolveWorkspace(workspace));
    assertToolEnabled(ws, "triage_evidence");
    const record = triageEvidence(ws, evidenceId, decision, by);
    return json({ evidence: record, readiness: workspaceReadiness(ws), message: `شواهد ${decision} شد.` });
  },
);

// ---------------------------------------------------------------------------
// Level 4 stubs — automation/external side effects are CONTRACTS ONLY until
// the workspace has real evidence + approval. Registering them as stubs keeps
// the error machine-readable instead of "unknown tool".
// ---------------------------------------------------------------------------

const LEVEL4_STUB_TOOLS = [
  "execute_automation",
  "execute_approved_automation",
  "mutate_crm",
  "financial_action",
  "approve_high_risk_action",
  "publish_external_content",
] as const;

for (const toolName of LEVEL4_STUB_TOOLS) {
  server.registerTool(toolName, {
    title: `[خاموش] ${toolName}`,
    description:
      "ابزار سطح ۴ (Automation / اثر بیرونی) — تا شواهد واقعی و تأیید انسانی غیرفعال است. این استاب همیشه با disabled_until_evidence پاسخ می‌دهد.",
    inputSchema: { workspace: workspaceParam.workspace },
  }, async ({ workspace }) => {
    try {
      const ws = loadWorkspace(resolveWorkspace(workspace));
      assertToolEnabled(ws, toolName);
      return json({ ok: true, note: "stub" });
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: error instanceof Error ? error.message : `tool_disabled:${toolName}` }],
        isError: true,
      };
    }
  });
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
