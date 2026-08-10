export type ReadinessTag = "داریم" | "لازم";
export type DevelopmentTag = "توسعه" | null;

export type Playbook = {
  id: number;
  نام_پلی_بوک: string;
  واحد_ارزش_مرکزی: string;
  نقش_مالک_منبع: string;
  خروجی_های_کلیدی: string;
  وضعیت_آمادگی_منبع: string;
  نوع_دارایی_هگام: string;
  سطح_هگام: string;
  نقش_مالک_استاندارد_هگام: string;
  وضعیت_نرمال_هگام: string;
  مسیر_بازگشت_داده: string;
  مثال_اجرایی: string;
  برچسب_داریم_لازم: ReadinessTag;
  برچسب_توسعه: DevelopmentTag;
  منبع_مستند: string | null;
  دامنه?: string;
  مدل_داده?: Record<string, unknown>;
  وابستگی_ها?: string[];
};

export type CasioKnowledge = {
  meta: {
    برند: string;
    برند_انگلیسی: string;
    نسخه: string;
    اسپرینت: number;
    [key: string]: unknown;
  };
  مدل_جنرال: Record<string, unknown>;
  مقایسه_جنرال_و_کاسیو: Record<string, unknown>;
  دارایی_ها: {
    تعداد_کل: number;
    پلی_بوک_ها: Playbook[];
    [key: string]: unknown;
  };
  معماری?: Record<string, unknown>;
  آموزش?: Record<string, unknown>;
  مستندات_کاسیو?: Record<string, unknown>;
  کیس_استادی?: Record<string, unknown>;
};

export type KnowledgeDocument = {
  کاسیو: CasioKnowledge;
};
