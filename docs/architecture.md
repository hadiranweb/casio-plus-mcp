# معماری CasioPlus MCP

## تصمیم معماری

CasioPlus MCP یک **لایهٔ بومیِ دسترسی، بازیابی و کنترل دانش** برای توپولوژی موجود کاسیو است. این لایه معماری کاسیو را بازتعریف نمی‌کند و به هیچ داشبورد، فورک یا محصول خاصی وابسته نیست.

FounderOS فقط یک منبع الهام برای «ساخت ساده، مرحله‌ای، داده‌محور و قابل اجرا» است؛ نه یک upstream یا مرجع اجباری طراحی.

```text
Knowledge Core کاسیو  →  CasioPlus MCP  →  هر Client مجاز
کاسیو.yaml / Markdown      Tools / Resources      AI / CLI / UI سبک
        ↑                         │
        └──── Review Queue ←──────┘
               بازخورد میدان
```

## مرزهای دامنه

| Bounded Context | مسئولیت | منبع حقیقت |
|---|---|---|
| Knowledge | پلی‌بوک، قالب، تصمیم، استاندارد، مدل داده | YAML/Markdown، سپس Git یا PostgreSQL |
| Learning | جلسه، نقش، تمرین، خروجی | مدل آموزشی کاسیو |
| Coaching | جلسه کوچینگ، Action Plan، گلوگاه | فرم/رجیستری کوچینگ |
| Metric | Action Score و سبز/زرد/قرمز | Casio Metric / رجیستری پایش |
| Growth | سفیر، ارجاع، امتیاز رشد، پاداش | رجیستری رشد |
| Operations | CRM، تقویم، کانال، تسک و workflow | سیستم خارجی/FounderOS |

## قرارداد نوشتن

هیچ ابزار MCP نباید در نسخه اولیه مستقیم `knowledge/casio.yaml` را تغییر دهد.

```text
submit_feedback_intake()
  → validate_record()
  → feedback queue
  → review by authorized role
  → proposed patch/version
  → human approval
  → Knowledge Core
```

## قواعد Agent

1. Agent قبل از پیشنهاد/عمل، دانش را از MCP بخواند.
2. Agent برای عملیات حساس فقط پیشنهاد تولید کند.
3. عملیات حساس باید `approval_id` و `audit_event_id` داشته باشد.
4. Agent هرگز credential یا متن کامل داده محرمانه را در خروجی عمومی ندهد.
