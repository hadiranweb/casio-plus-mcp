import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  DEFAULT_KNOWLEDGE_PATH,
  getPlaybook,
  knowledgeSummary,
  loadKnowledge,
  searchPlaybooks,
} from "./knowledge-store.js";
import { attachProposalToFeedback, listFeedbackQueue, reviewFeedback, submitFeedback } from "./intake-store.js";
import { listAuditEvents, recordAuditEvent } from "./audit-store.js";
import { createVersionProposal, listVersionProposals } from "./proposal-store.js";
import { feedbackInputSchema, validateFeedback } from "./quality.js";

const knowledgePath = process.env.CASIO_KNOWLEDGE_PATH ?? DEFAULT_KNOWLEDGE_PATH;
const knowledge = loadKnowledge(knowledgePath);

const server = new McpServer({
  name: "casio-plus-mcp",
  version: "0.1.0",
});

function json(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

server.registerResource(
  "casio-knowledge-summary",
  "casio://knowledge/summary",
  {
    title: "خلاصهٔ دانش کاسیو‌پلاس",
    description: "نسخه، اسپرینت و آمار پلی‌بوک‌های کاسیو‌پلاس.",
    mimeType: "application/json",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(knowledgeSummary(knowledge), null, 2) }],
  }),
);

server.registerResource(
  "casio-playbook",
  new ResourceTemplate("casio://playbooks/{id}", { list: undefined }),
  {
    title: "پلی‌بوک کاسیو‌پلاس",
    description: "یک پلی‌بوک با مدل داده، وابستگی‌ها، مثال اجرایی و وضعیت آمادگی.",
    mimeType: "application/json",
  },
  async (uri, variables) => {
    const id = Number(variables.id);
    const playbook = getPlaybook(knowledge, id);
    if (!playbook) {
      throw new Error(`Playbook not found: ${variables.id}`);
    }
    return {
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(playbook, null, 2) }],
    };
  },
);

server.registerTool(
  "search_playbooks",
  {
    title: "جست‌وجوی پلی‌بوک‌های کاسیو‌پلاس",
    description: "پلی‌بوک‌ها را بر اساس متن، دامنه، نقش HEGAM، سطح، نوع دارایی، برچسب داریم/لازم یا توسعه جست‌وجو می‌کند.",
    inputSchema: {
      query: z.string().optional().describe("عبارت جست‌وجو در نام، خروجی، دامنه یا مثال اجرایی"),
      domain: z.string().optional().describe("دامنه مانند «آموزش و کوچینگ»"),
      role: z.string().optional().describe("نقش مالک استاندارد HEGAM"),
      level: z.string().optional().describe("سطح HEGAM، مثلاً «سطح ۳: معمار دانش»"),
      assetType: z.string().optional().describe("نوع دارایی HEGAM مانند «پلی‌بوک» یا «قالب»"),
      readiness: z.enum(["داریم", "لازم"]).optional().describe("برچسب وضعیت دارایی"),
      development: z.boolean().optional().describe("true فقط برای آیتم‌های در توسعه؛ false برای غیرتوسعه"),
    },
  },
  async (filters) => {
    const results = searchPlaybooks(knowledge, filters);
    return json({ count: results.length, playbooks: results });
  },
);

server.registerTool(
  "get_playbook",
  {
    title: "دریافت پلی‌بوک",
    description: "یک پلی‌بوک را با شناسهٔ عددی آن دریافت می‌کند.",
    inputSchema: { id: z.number().int().positive().describe("شناسهٔ پلی‌بوک از ۱ تا ۵۶") },
  },
  async ({ id }) => {
    const playbook = getPlaybook(knowledge, id);
    if (!playbook) {
      return {
        content: [{ type: "text" as const, text: `پلی‌بوک با شناسهٔ ${id} پیدا نشد.` }],
        isError: true,
      };
    }
    return json(playbook);
  },
);

server.registerTool(
  "get_architecture",
  {
    title: "دریافت معماری کاسیو‌پلاس",
    description: "زیرسیستم‌ها، جریان داده و اصل بازگشت داده در معماری کاسیو را برمی‌گرداند.",
    inputSchema: {},
  },
  async () => json(knowledge.معماری ?? { message: "معماری هنوز در مدل ثبت نشده است." }),
);

server.registerTool(
  "get_learning_path",
  {
    title: "مسیر آموزشی کاسیو‌پلاس",
    description: "برنامهٔ ۹ جلسه، مسیر نقش‌ها یا قالب‌های استاندارد را برمی‌گرداند.",
    inputSchema: {
      section: z.enum(["sessions", "roles", "templates", "all"]).default("all"),
    },
  },
  async ({ section }) => {
    const training = knowledge.آموزش ?? {};
    if (section === "sessions") return json({ sessions: training["برنامه_جلسات"] ?? [] });
    if (section === "roles") return json({ roles: training["مسیر_نقش_ها"] ?? [] });
    if (section === "templates") return json({ templates: training["قالب_های_استاندارد"] ?? [] });
    return json(training);
  },
);

server.registerTool(
  "validate_record",
  {
    title: "اعتبارسنجی رکورد بازخورد",
    description: "رکورد بازخورد میدان را از نظر کامل‌بودن، مرجع پلی‌بوک، منشأ، یکدستی و زمینه بررسی می‌کند؛ هیچ داده‌ای ذخیره نمی‌شود.",
    inputSchema: {
      sourceSystem: z.string().min(2).describe("منبع، مانند casio-metric یا coaching-session"),
      sourceType: z.string().min(2).describe("نوع رخداد، مانند observation یا coaching_note"),
      submittedBy: z.string().min(2).describe("شناسه یا نام ثبت‌کننده"),
      relatedAssetId: z.number().int().positive().describe("شناسه پلی‌بوک مرتبط"),
      summary: z.string().min(20).describe("شرح مشاهده یا بازخورد"),
      occurredAt: z.string().datetime({ offset: true }).optional().describe("زمان رخداد در ISO-8601"),
      payload: z.record(z.unknown()).optional().describe("داده ساختاریافته تکمیلی"),
    },
  },
  async (rawInput) => {
    const input = feedbackInputSchema.parse(rawInput);
    return json(validateFeedback(input, knowledge));
  },
);

server.registerTool(
  "submit_feedback_intake",
  {
    title: "ثبت بازخورد در صف بررسی",
    description: "بازخورد را پس از اعتبارسنجی در صف محلی review ثبت می‌کند. این ابزار هرگز casio.yaml را تغییر نمی‌دهد.",
    inputSchema: {
      sourceSystem: z.string().min(2).describe("منبع، مانند casio-metric یا coaching-session"),
      sourceType: z.string().min(2).describe("نوع رخداد، مانند observation یا coaching_note"),
      submittedBy: z.string().min(2).describe("شناسه یا نام ثبت‌کننده"),
      relatedAssetId: z.number().int().positive().describe("شناسه پلی‌بوک مرتبط"),
      summary: z.string().min(20).describe("شرح مشاهده یا بازخورد"),
      occurredAt: z.string().datetime({ offset: true }).optional().describe("زمان رخداد در ISO-8601"),
      payload: z.record(z.unknown()).optional().describe("داده ساختاریافته تکمیلی"),
    },
  },
  async (rawInput) => {
    const input = feedbackInputSchema.parse(rawInput);
    const report = validateFeedback(input, knowledge);
    const result = submitFeedback(input, report);
    return json({
      id: result.record.id,
      qualityStatus: result.record.qualityStatus,
      reviewStatus: result.record.reviewStatus,
      duplicateOf: result.duplicateOf ?? null,
      qualityReport: result.record.qualityReport,
      message: "بازخورد در صف بررسی ثبت شد؛ هستهٔ دانش تغییر نکرده است.",
    });
  },
);

server.registerTool(
  "list_review_queue",
  {
    title: "مشاهده صف بررسی بازخورد",
    description: "رکوردهای feedback intake را بر اساس کیفیت، وضعیت بررسی یا پلی‌بوک مرتبط نمایش می‌دهد.",
    inputSchema: {
      qualityStatus: z.enum(["raw", "quarantined", "validated", "rejected"]).optional(),
      reviewStatus: z.enum(["pending_review", "approved", "rejected"]).optional(),
      relatedAssetId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    },
  },
  async (filters) => {
    const records = listFeedbackQueue(filters);
    return json({ count: records.length, records });
  },
);

server.registerTool(
  "review_feedback",
  {
    title: "بررسی بازخورد و ساخت پیشنهاد نسخه‌ای",
    description: "یک بازخورد validated را تأیید یا رد می‌کند. در حالت تأیید، پیشنهاد تغییر نسخه‌ای می‌سازد؛ casio.yaml تغییر نمی‌کند.",
    inputSchema: {
      feedbackId: z.string().min(5).describe("شناسهٔ feedback intake مانند fbk_…"),
      decision: z.enum(["approved", "rejected"]),
      reviewer: z.string().min(2).describe("شناسه یا نام بازبین مجاز"),
      reviewNote: z.string().min(10).max(5000).describe("دلیل و یادداشت بررسی"),
    },
  },
  async ({ feedbackId, decision, reviewer, reviewNote }) => {
    try {
      const feedback = reviewFeedback(feedbackId, decision, reviewer, reviewNote);
      const audit = recordAuditEvent({
        action: `feedback_${decision}`,
        actor: reviewer,
        entityType: "feedback",
        entityId: feedback.id,
        details: { relatedAssetId: feedback.relatedAssetId, reviewNote },
      });

      if (decision === "rejected") {
        return json({ feedback, audit, proposal: null, message: "بازخورد رد شد؛ هستهٔ دانش تغییر نکرده است." });
      }

      const playbook = getPlaybook(knowledge, feedback.relatedAssetId);
      if (!playbook) throw new Error(`Related playbook not found: ${feedback.relatedAssetId}`);
      const proposal = createVersionProposal(feedback, playbook, knowledge.meta.نسخه, reviewer, reviewNote);
      const linked = attachProposalToFeedback(feedback.id, proposal.id);
      const proposalAudit = recordAuditEvent({
        action: "version_proposal_created",
        actor: reviewer,
        entityType: "version_proposal",
        entityId: proposal.id,
        details: { feedbackId: feedback.id, relatedAssetId: feedback.relatedAssetId, baseKnowledgeVersion: knowledge.meta.نسخه },
      });
      return json({
        feedback: linked,
        audit: [audit, proposalAudit],
        proposal,
        message: "بازخورد تأیید شد و پیشنهاد نسخه‌ای برای ادغام انسانی ساخته شد؛ casio.yaml تغییر نکرده است.",
      });
    } catch (error) {
      return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Review failed" }], isError: true };
    }
  },
);

server.registerTool(
  "list_version_proposals",
  {
    title: "مشاهدهٔ پیشنهادهای نسخه‌ای",
    description: "پیشنهادهای ساخته‌شده از بازخوردهای تأییدشده را نمایش می‌دهد؛ ادغام با knowledge core همچنان انسانی است.",
    inputSchema: {
      status: z.enum(["pending_human_merge", "merged", "discarded"]).optional(),
      limit: z.number().int().min(1).max(200).optional(),
    },
  },
  async ({ status, limit }) => {
    const proposals = listVersionProposals(status, limit);
    return json({ count: proposals.length, proposals });
  },
);

server.registerTool(
  "list_audit_events",
  {
    title: "مشاهدهٔ ردپای ممیزی",
    description: "رویدادهای ثبت‌شده برای بررسی، تأیید/رد و ساخت پیشنهاد نسخه‌ای را نمایش می‌دهد.",
    inputSchema: { limit: z.number().int().min(1).max(200).optional() },
  },
  async ({ limit }) => {
    const events = listAuditEvents(limit);
    return json({ count: events.length, events });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
