import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

export type CasioPlaybook = {
  id: number;
  نام_پلی_بوک: string;
  دامنه?: string;
  نوع_دارایی_هگام: string;
  سطح_هگام: string;
  نقش_مالک_استاندارد_هگام: string;
  وضعیت_نرمال_هگام: string;
  برچسب_داریم_لازم: 'داریم' | 'لازم';
  برچسب_توسعه: 'توسعه' | null;
  خروجی_های_کلیدی: string;
  مثال_اجرایی: string;
  مسیر_بازگشت_داده: string;
  وابستگی_ها?: string[];
};

type CasioFile = {
  کاسیو: {
    meta: { برند: string; برند_انگلیسی: string; نسخه: string; اسپرینت: number };
    دارایی_ها: { پلی_بوک_ها: CasioPlaybook[] };
    معماری?: { زیرسیستم_ها?: { نام: string; تعداد_پلی_بوک: number; پلی_بوک_ها: string[] }[] };
    آموزش?: { برنامه_جلسات?: { جلسه: number; عنوان: string; هدف: string; خروجی: string }[] };
  };
};

let cache: CasioFile['کاسیو'] | null = null;

export function getCasioKnowledge(): CasioFile['کاسیو'] {
  if (cache) return cache;
  const source = process.env.CASIO_KNOWLEDGE_PATH ?? path.join(process.cwd(), 'knowledge', 'casio.yaml');
  const raw = fs.readFileSync(source, 'utf8');
  const parsed = parse(raw) as CasioFile;
  if (!parsed?.کاسیو?.دارایی_ها?.پلی_بوک_ها) throw new Error('Casio knowledge file is invalid.');
  cache = parsed.کاسیو;
  return cache;
}

export function casioSummary() {
  const casio = getCasioKnowledge();
  const playbooks = casio.دارایی_ها.پلی_بوک_ها;
  return {
    casio,
    playbooks,
    have: playbooks.filter((p) => p.برچسب_داریم_لازم === 'داریم').length,
    need: playbooks.filter((p) => p.برچسب_داریم_لازم === 'لازم').length,
    developing: playbooks.filter((p) => p.برچسب_توسعه === 'توسعه').length,
    domains: casio.معماری?.زیرسیستم_ها ?? [],
  };
}
