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

const transport = new StdioServerTransport();
await server.connect(transport);
