# پلن جنرال GenFlow / CasioPlus — بایگانی + نقشهٔ اجرا در این ریپو

**تاریخ بایگانی:** ۹ آگوست ۲۰۲۶
**ماهیت:** پلن «چیستی» بدون بعد زمان — هیچ تخمین و ترتیب زمانی ندارد. تمرکز: تمیزی، اطمینان، بستن حلقه‌ها.
**این سند:** متن پلن (خلاصهٔ وفادار) + «نقشهٔ اجرا» که نشان می‌دهد هر بخش کجا اجرا شده / متعلق به کدام ریپو است.

---

## ۱. چشم‌انداز معماری (خلاصهٔ وفادار)

GenFlow / CasioPlus یک **ارگانیسم زنده** است، نه مجموعه‌ای از فایل‌ها:

- **Islands** — اندام‌های مستقل با مرز، دیتا و شکست مستقل
- **Receptors** — پروتئین‌های غشایی؛ قراردادهای مشترک بین اندام‌ها
- **Synaptic Hub** — مغز مرکزی: Route، Validate، Audit، Measure، Converge
- **Cells** — واحدهای عملکردی کوچک، هرکدام یک سرویس قابل تست
- **Event Flows** — سیگنال‌های عصبی؛ مسیر حرکت داده
- **اصل هشتم (از نقد): Measurement Closure** — هر ابزار با معیار پذیرش خودش سنجیده شود

## ۲. وضعیت موجود — ژنوم (خلاصه)

**دارایی‌ها:** ۸ crate (Rust) + Remix؛ CI سبز هر دو ریپو؛ Release DryRun/Real؛ island data-cleaning (missing/duplicates/inconsistency + strsim)؛ امنیت (TenantAuth + RLS + SHA pinning)؛ تست Authorization Matrix.

**شکاف‌ها (از نقد):** توانایی ≠ در گردش (`casio.yaml` هنوز 0.4.1، مشتری واقعی وارد نشده)؛ حلقه در جهت دانش بسته، در جهت ابزار باز بود؛ مشتری رکورد است نه سطح.

## ۳. اصول معماری مورد نظر (خلاصه)

- **Island Pattern:** هر برند/دامنه = Island مستقل با `knowledge/`، `feedback/`، `audit/`، `config.json`
- **Receptor Pattern:** قرارداد مشترک مثل USB؛ `CustomerReceptor` (onboard/assess/match/hire/retain/churn/refer) و `MeasurementReceptor` (measure_against_criteria)
- **Synaptic Hub:** Route → Validate → Transform → Audit → **Measure** → Converge
- **Event Flows:** declarative در `event-flows.yaml`؛ جریان جدید `tool.executed: [validate, execute, measure_against_acceptance, audit, converge]`
- **Customer به‌عنوان سطح:** از `learnerId` به Customer Aggregate با lifecycle و مرز جدا؛ دوسویه (دریافت سرویس + تولید بازخورد/referral)

## ۴. حوزه‌های اقدام (خلاصه)

- **A داده:** اتصال data-cleaning قبل از composite در candidate-matching؛ استانداردسازی مهارت‌ها (آستانه 0.85)؛ normalize_email/phone/name
- **B معماری:** B1 گردش واقعی (مشتری/پوزیشن/کاندیدای واقعی، بازخورد میدانی → casio.yaml نسخه جدید، ابزار مشتری wizard)؛ B2 بستن حلقه ابزار (چک acceptance + Event ToolFailed/ToolSucceeded + بازکالیبره weights)؛ B3 ارتقای مشتری به سطح (Island customer-journey + CustomerReceptor + مرز جدا)
- **C امنیت/کیفیت:** SHA pinning، حذف secrets[format]، تفکیک staging/production؛ CI/DryRun سبز؛ تست Measurement Closure + Authorization Matrix
- **D مستندات حداقل (۵ لایه):** 00-CORE، 01-ARCHITECTURE، 08-SCHEMAS، 11-TESTING، 18-DEPLOYMENT
- **E انتشار:** تگ معنایی، GHCR، تفکیک dry_run/real، Dockerfile با data-cleaning و context درست

## ۵. معیارهای پذیرش و وابستگی‌ها

CI سبز هر دو ریپو؛ DryRun سبز؛ Release Real API سبز؛ data-cleaning در workspace+Dockerfile+matching؛ Customer به‌عنوان Aggregate با lifecycle؛ Hub نتیجه هر ابزار را با acceptanceCriteria می‌سنجد و Event تولید می‌کند؛ یک مشتری واقعی + بازخورد میدانی در casio.yaml نسخه جدید؛ Authorization Matrix کامل می‌گذرد.
وابستگی‌ها: customer-journey ← CustomerReceptor + MeasurementReceptor؛ Measurement Closure ← event-flows.yaml؛ data-cleaning ← Cargo.toml + Dockerfile؛ Release Docker ← allowlist docker/* یا self-hosted runner.

---

## نقشهٔ اجرا — وضعیت هر بخش

### ✅ در casio-plus-mcp اجرا شده (این ریپو، این شاخه)

| بخش پلن | کجا | کامیت |
|---|---|---|
| **Measurement Closure (اصل ۸)** — چک acceptance + صف بازخورد | `operator/lib/automation-run.ts` + تست‌ها | `4dfe349` |
| **یکپارچگی حلقه + dedup فازی** | `src/intake-store.ts`، `src/text-similarity.ts` | `86b7584` |
| **MeasurementReceptor** — `measureAgainstCriteria` + `toolEventFor` | `operator/lib/measurement-receptor.ts` + ران‌ها Event `ToolSucceeded/ToolFailed/ToolUnverifiable` تولید می‌کنند | این نوبت |
| **CustomerReceptor + Customer Aggregate** — lifecycle کامل + referral + مرز دادهٔ جدا | `operator/lib/customer.ts` (`data/customers.json`) | این نوبت |
| **Event Flows declarative** — `feedback.submitted`، `knowledge.searched`، `tool.executed` + اعتبارسنجی در load | `operator/event-flows.yaml` + `operator/lib/event-flows.ts` | این نوبت |
| **Authorization Matrix تست (ROLE × PERMISSION)** | `operator/tests/authorization-matrix.test.ts` | این نوبت |
| **Measurement Closure تست** | `operator/tests/measurement-receptor.test.ts` + `automation-acceptance.test.ts` | این نوبت |
| **مستندات حداقل (بخش ۰۱-ARCHITECTURE)** | `docs/island-topology.json` + `docs/general-plan.md` | این نوبت |
| **پایهٔ حلقه بازخورد (B2 جزئی)** — رکورد validated → تأیید انسانی → پیشنهاد نسخه | `src/` (MCP core) | `86b7584` |

### ⏳ متعلق به ریپوهای GenFlow (خارج از این ریپو)

| بخش پلن | وضعیت |
|---|---|
| اتصال data-cleaning به candidate-matching قبل از composite (حوزه A) | نیاز به `islands/candidate-matching` |
| استانداردسازی مهارت‌ها + normalize_phone (حوزه A) | در island data-cleaning |
| Dockerfile با context درست Web (`context: .`) (حوزه E) | فیکس P0 از گزارش GenFlow |
| Release Real با Docker + allowlist `docker/*` (حوزه E) | نیاز به ادمین Org |
| Event به Synaptic Hub + بازکالیبره weights پنج‌محور (B2 کامل) | نیاز به hub Rust |

### 🔜 آینده (وقتی کوهورت واقعی وارد شد)

| بخش پلن | پیش‌نیاز |
|---|---|
| B1 گردش واقعی: مشتری واقعی + پوزیشن + کاندیدا + بازخورد میدانی → `casio.yaml` نسخه جدید | اولین کوهورت |
| ابزار مشتری (wizard ۳ مرحله‌ای) متصل به Gateway | B1 |
| مرز توکن/پورتال مشتری جدا از اپراتور (B3 کامل) | گام ۶ نقشه راه توسعه |
| تفکیک staging/production + cron runner | گام ۸ نقشه راه توسعه |

---

## جمع‌بندی

این نوبت، **همهٔ بخش‌های قابل اجرا در casio-plus-mcp** از پلن جنرال پیاده و تست شد: اصل هشتم (Measurement Closure) به‌صورت Receptor رسمی، مشتری به‌عنوان Aggregate با lifecycle و CustomerReceptor، جریان‌های رویداد declarative با اعتبارسنجی، ماتریس Authorization، و مستندات حداقل. بخش‌های Rust (data-cleaning→matching، hub، Dockerfile) متعلق به ریپوهای GenFlow هستند و بخش‌های «گردش واقعی» منتظر اولین کوهورت مشتری‌اند — طبق پلن، هیچ‌کدام «زمان» ندارند، فقط «چیستی»شان روشن است.
