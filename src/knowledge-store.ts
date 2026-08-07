import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { z } from "zod";
import type { CasioKnowledge, KnowledgeDocument, Playbook } from "./types.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_KNOWLEDGE_PATH = path.resolve(moduleDir, "../knowledge/casio.yaml");

const playbookSchema = z.object({
  id: z.number().int().positive(),
  نام_پلی_بوک: z.string().min(1),
  واحد_ارزش_مرکزی: z.string(),
  نقش_مالک_منبع: z.string(),
  خروجی_های_کلیدی: z.string(),
  وضعیت_آمادگی_منبع: z.string(),
  نوع_دارایی_هگام: z.string(),
  سطح_هگام: z.string(),
  نقش_مالک_استاندارد_هگام: z.string(),
  وضعیت_نرمال_هگام: z.string(),
  مسیر_بازگشت_داده: z.string(),
  مثال_اجرایی: z.string(),
  برچسب_داریم_لازم: z.enum(["داریم", "لازم"]),
  برچسب_توسعه: z.enum(["توسعه"]).nullable(),
  منبع_مستند: z.string().nullable(),
  دامنه: z.string().optional(),
  مدل_داده: z.record(z.unknown()).optional(),
  وابستگی_ها: z.array(z.string()).optional(),
}).passthrough();

const casioSchema = z.object({
  meta: z.object({
    برند: z.string(),
    برند_انگلیسی: z.string(),
    نسخه: z.string(),
    اسپرینت: z.number(),
  }).passthrough(),
  مدل_جنرال: z.record(z.unknown()),
  مقایسه_جنرال_و_کاسیو: z.record(z.unknown()),
  دارایی_ها: z.object({
    تعداد_کل: z.number().int().nonnegative(),
    پلی_بوک_ها: z.array(playbookSchema),
  }).passthrough(),
}).passthrough();

const documentSchema = z.object({ کاسیو: casioSchema });

export function loadKnowledge(filePath = DEFAULT_KNOWLEDGE_PATH): CasioKnowledge {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Knowledge file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parse(raw);
  const result = documentSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid Casio knowledge YAML: ${result.error.message}`);
  }

  const knowledge = result.data as unknown as KnowledgeDocument;
  const playbooks = knowledge.کاسیو.دارایی_ها.پلی_بوک_ها;

  if (knowledge.کاسیو.دارایی_ها.تعداد_کل !== playbooks.length) {
    throw new Error(
      `Knowledge integrity error: declared ${knowledge.کاسیو.دارایی_ها.تعداد_کل} playbooks, found ${playbooks.length}.`,
    );
  }

  return knowledge.کاسیو;
}

export function getPlaybook(knowledge: CasioKnowledge, id: number): Playbook | undefined {
  return knowledge.دارایی_ها.پلی_بوک_ها.find((item) => item.id === id);
}

export type PlaybookFilters = {
  query?: string;
  domain?: string;
  role?: string;
  level?: string;
  assetType?: string;
  readiness?: "داریم" | "لازم";
  development?: boolean;
};

function contains(value: string | undefined, needle: string): boolean {
  return value?.toLocaleLowerCase("fa-IR").includes(needle.toLocaleLowerCase("fa-IR")) ?? false;
}

export function searchPlaybooks(knowledge: CasioKnowledge, filters: PlaybookFilters = {}): Playbook[] {
  const query = filters.query?.trim();

  return knowledge.دارایی_ها.پلی_بوک_ها.filter((playbook) => {
    if (filters.domain && playbook.دامنه !== filters.domain) return false;
    if (filters.role && playbook.نقش_مالک_استاندارد_هگام !== filters.role) return false;
    if (filters.level && playbook.سطح_هگام !== filters.level) return false;
    if (filters.assetType && playbook.نوع_دارایی_هگام !== filters.assetType) return false;
    if (filters.readiness && playbook.برچسب_داریم_لازم !== filters.readiness) return false;
    if (filters.development !== undefined && (playbook.برچسب_توسعه === "توسعه") !== filters.development) return false;

    if (!query) return true;
    return [
      playbook.نام_پلی_بوک,
      playbook.واحد_ارزش_مرکزی,
      playbook.خروجی_های_کلیدی,
      playbook.دامنه,
      playbook.مثال_اجرایی,
    ].some((field) => contains(field, query));
  });
}

export function knowledgeSummary(knowledge: CasioKnowledge) {
  const playbooks = knowledge.دارایی_ها.پلی_بوک_ها;
  const count = (predicate: (playbook: Playbook) => boolean) => playbooks.filter(predicate).length;

  return {
    برند: knowledge.meta.برند,
    برند_انگلیسی: knowledge.meta.برند_انگلیسی,
    نسخه: knowledge.meta.نسخه,
    اسپرینت: knowledge.meta.اسپرینت,
    تعداد_کل_پلی_بوک: playbooks.length,
    داریم: count((item) => item.برچسب_داریم_لازم === "داریم"),
    لازم: count((item) => item.برچسب_داریم_لازم === "لازم"),
    توسعه: count((item) => item.برچسب_توسعه === "توسعه"),
  };
}
