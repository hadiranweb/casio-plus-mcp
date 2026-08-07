# CasioPlus MCP

> **MCP server برای اکوسیستم دانش و عملیات کاسیو‌پلاس**  
> **CasioPlus MCP Server for the Casio Plus knowledge-and-operations ecosystem**

`CasioPlus MCP` یک سرور [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) است که مدل دانش کاسیو‌پلاس را به ابزارهای هوش مصنوعی، عامل‌ها و در آینده به **Casio Operator** (فورک FounderOS) متصل می‌کند.

این ریپو یک «عامل همه‌کاره» یا جایگزین CRM نیست. نقش آن یک **Knowledge Gateway کنترل‌شده** است: دانشِ معتبر را بازیابی می‌کند، ساختار و کیفیت داده را بررسی می‌کند، و بازخورد عملیات را بدون آلودن مستقیم هستهٔ دانش به صف بررسی وارد می‌کند.

---

## اصل معماری

```text
Casio Knowledge Core                    CasioPlus MCP                  Casio Operator
────────────────────                    ─────────────                  ──────────────
کاسیو.yaml + Markdown       →       Tools / Resources / Prompts   →   Dashboard / Agents
پلی‌بوک / رجیستری / SOP              Validation / Retrieval            CRM / Tasks / Workflows
منبع حقیقت دانش                       Controlled feedback intake        سطح عملیات
        ↑                                                                         │
        └──── Review + approval ← Feedback Intake Queue ←────────────────────────┘
```

### قانون غیرقابل‌مذاکره

- **Knowledge Core منبع حقیقت است.** در نسخهٔ اولیه: `knowledge/casio.yaml` و Markdownهای ساختاریافته.
- **MCP لایهٔ دسترسی و کنترل است.** نه منبع حقیقت دوم.
- **Casio Operator لایهٔ تعامل و عملیات است.** نه محل ساخت دانش سازمانی.
- بازخورد عملیاتی با write مستقیم وارد مدل دانش نمی‌شود؛ ابتدا اعتبارسنجی، صف‌بندی، بررسی انسانی و سپس ادغام نسخه‌ای می‌شود.

---

## مسئله‌ای که حل می‌کند

کاسیو‌پلاس هم‌اکنون شامل این مؤلفه‌هاست:

- ۵۶ پلی‌بوک و راهنمای اجرایی، با مالک، سطح HEGAM، وابستگی و مسیر بازگشت داده؛
- ۱۰ مستند عملیاتی واقعی؛
- ۶ زیرسیستم: زیرساخت دانش، فروش و بازاریابی، محتوا و کانال بله، آموزش و کوچینگ، پایش و ارزیابی، اکوسیستم و مشارکت رشد؛
- برنامهٔ ۹ جلسه‌ای، ۸ نقش استاندارد و ۶ قالب دارایی؛
- مدل Casio Metric، کوچینگ، سفیران، مشارکت رشد و Data Cleaning Gate.

بدون یک Gateway، عامل‌ها و داشبوردها یا به دادهٔ خام و پراکنده متصل می‌شوند، یا نسخه‌های متفاوتی از «حقیقت» می‌سازند. CasioPlus MCP این مرز را استاندارد می‌کند.

---

## دامنهٔ نسخهٔ اول (MVP)

### منابع MCP (Resources)

| URI پیشنهادی | کاربرد |
|---|---|
| `casio://knowledge/model` | مدل جنرال HEGAM و قواعد کاسیو |
| `casio://playbooks` | فهرست همهٔ پلی‌بوک‌ها |
| `casio://playbooks/{id}` | یک پلی‌بوک با مثال، مدل داده و وابستگی‌ها |
| `casio://architecture` | ۶ زیرسیستم و جریان داده |
| `casio://learning/program` | ۹ جلسه، نقش‌ها و قالب‌ها |
| `casio://documents` | فهرست و خلاصهٔ مستندات واقعی |
| `casio://gaps` | دارایی‌های برچسب‌خورده با `لازم` یا `توسعه` |

### ابزارهای MCP (Tools)

| Tool | حالت | شرح |
|---|---|---|
| `search_playbooks` | Read | جست‌وجوی پلی‌بوک بر اساس دامنه، نقش، سطح، وضعیت یا متن |
| `get_playbook` | Read | دریافت پلی‌بوک کامل با وابستگی‌ها و مثال اجرایی |
| `get_architecture` | Read | دریافت نقشهٔ زیرسیستم‌ها و جریان داده |
| `get_learning_path` | Read | مسیر آموزشی بر اساس نقش یا سطح HEGAM |
| `validate_record` | Validate | بررسی کامل‌بودن، تکرار، اعتبار، یکدستی و منشأ داده |
| `submit_feedback_intake` | Write-to-queue | ثبت کنترل‌شدهٔ بازخورد میدان در صف بررسی؛ **بدون نوشتن مستقیم در Knowledge Core** |
| `list_review_queue` | Read | مشاهدهٔ آیتم‌های منتظر بررسی (RBAC لازم) |
| `approve_feedback` | Controlled write | فقط برای نقش مجاز؛ تبدیل بازخورد تأییدشده به پیشنهاد تغییر نسخه‌ای |

### Promptهای MCP

| Prompt | هدف |
|---|---|
| `design_playbook` | ساخت پیش‌نویس پلی‌بوک بر مبنای HEGAM و یک مسئلهٔ کسب‌وکار |
| `analyze_system_gap` | تشخیص شکاف «داریم/لازم/توسعه» در یک دامنه |
| `prepare_coaching_session` | طراحی جلسهٔ کوچینگ با گلوگاه، Action Plan و معیار موفقیت |
| `review_feedback` | تبدیل بازخورد خام به رکورد قابل بررسی و تصمیم |
| `build_automation_spec` | تولید مشخصات اتوماسیون، با ورودی/خروجی/خطا/معیار پذیرش |

---

## Data Quality Gate

هر دادهٔ بیرونی قبل از ورود به `feedback_intake` از این گیت عبور می‌کند:

```text
raw → validate → quarantined / rejected / validated → review → approved → versioned knowledge change
```

| کنترل | پرسش |
|---|---|
| Completeness | فیلدهای اجباری کامل‌اند؟ |
| Duplicates | رکورد مشابه یا شناسهٔ تکراری وجود دارد؟ |
| Validity | مقدار در بازه/فرمت معتبر است؟ |
| Consistency | نقش، کد، تاریخ و وضعیت با استاندارد کاسیو یکدست‌اند؟ |
| Provenance | منبع، زمان و ثبت‌کننده روشن است؟ |
| Authorization | ثبت‌کننده برای این دامنه مجاز است؟ |

وضعیت کیفیت هر رکورد:

```yaml
quality_status: raw | quarantined | validated | rejected
```

---

## مدل دسترسی پیشنهادی

نسخهٔ محلی می‌تواند با `stdio` و بدون شبکه اجرا شود. در استقرار شبکه‌ای، Shared Token فورک FounderOS برای کاسیو کافی نیست.

| نقش | دسترسی نمونه |
|---|---|
| معمار سیستمسازی | ساختار دانش، Canvas، MOC |
| طراح متدولوژی | پیش‌نویس و نسخهٔ پلی‌بوک/قالب |
| تحلیلگر داده | مدل داده، رجیستری، کیفیت داده |
| مدیر حافظه داده | بازبینی و ادغام بازخورد |
| مالک اتوماسیون | Spec و اجرای workflow تأییدشده |
| ناظر انطباق | سیاست، ممیزی، تأیید نهایی |
| کوچ فرایند | ثبت مشاهده و بازخورد میدان |

**اصل امنیتی:** Agentها در فاز اول فقط `read` و `recommend` دارند. هر اقدام حساس (ارسال پیام، تغییر CRM، انتشار محتوا، تغییر مالی، یا write به هستهٔ دانش) به تأیید انسان و Audit Log نیاز دارد.

---

## ساختار ریپو

```text
casio-plus-mcp/
├── knowledge/
│   └── casio.yaml              # منبع فعلی مدل دانش کاسیو‌پلاس
├── src/
│   ├── server.ts               # MCP server entrypoint (مرحله بعد)
│   ├── knowledge-store.ts      # Adapter برای YAML / Markdown / DB
│   ├── validators.ts           # Data Quality Gate
│   ├── tools/                  # MCP tools
│   ├── resources/              # MCP resources
│   └── prompts/                # MCP prompts
├── tests/
├── docs/
│   ├── architecture.md
│   ├── data-contracts.md
│   └── upstream-founderos.md
├── package.json                # مرحله بعد
├── .env.example                # مرحله بعد
└── README.md
```

---

## ارتباط با FounderOS Fork

این ریپو، جایگزین فورک FounderOS نیست؛ یک dependency/domain service برای آن است.

```text
casio-plus-mcp                  casio-operator (FounderOS fork)
────────────────               ────────────────────────────────
System of knowledge access  →  System of engagement / dashboard
MCP tools + resources       →  UI, workflows, connectors, agents
Validation + review queue   ←  Field feedback / operational signals
```

در FounderOS، `BrainProvider` و Repository Layer بهترین نقاط اتصال هستند:

1. یک `CasioKnowledgeProvider` پیاده‌سازی شود.
2. `/brain` پلی‌بوک‌ها، نقش‌ها، دامنه‌ها و وابستگی‌های کاسیو را نمایش دهد.
3. هر Agent پیش از اقدام، از MCP اطلاعات معتبر بخواند.
4. خروجی/بازخورد Agent فقط با `submit_feedback_intake` به صف بررسی وارد شود.

---

## نقشهٔ راه

### Phase 0 — Foundation
- [x] ایجاد مدل `کاسیو.yaml`
- [x] استخراج مستندات کاسیو
- [x] مدل HEGAM، معماری، آموزش و کیس‌استادی
- [x] ایجاد اسکلت این ریپو و README

### Phase 1 — Read-only MCP
- [ ] TypeScript + رسمی MCP SDK
- [ ] YAML Knowledge Store
- [ ] Resourceهای `model`, `playbooks`, `architecture`, `learning`
- [ ] Toolهای `search_playbooks`, `get_playbook`, `get_architecture`
- [ ] تست قراردادها و schema validation

### Phase 2 — Quality & Feedback
- [ ] `validate_record`
- [ ] SQLite/PostgreSQL feedback intake queue
- [ ] Data Quality Gate
- [ ] Audit log و review workflow

### Phase 3 — Casio Operator Integration
- [ ] `CasioKnowledgeProvider` در فورک FounderOS
- [ ] نقشهٔ `/brain` برای کاسیو
- [ ] داشبورد Casio Metric و کوچینگ
- [ ] RBAC و SSO

### Phase 4 — Guarded Automation
- [ ] Agent approval gate
- [ ] Automation Spec → workflow
- [ ] کانکتورهای CRM/بله/تقویم/مالی با policy کنترل‌شده

---

## توسعهٔ محلی (پس از اضافه‌شدن کد)

```bash
npm install
npm run dev
# یا برای MCP محلی:
npm run start:stdio
```

---

## منابع مفهومی

- **HEGAM / Casio Plus:** مدل دانش داخلی کاسیو‌پلاس در `knowledge/casio.yaml`
- **FounderOS-DEMO:** https://github.com/Bennettxai/FounderOS-DEMO
- **Model Context Protocol:** https://modelcontextprotocol.io/
- **ISO 30401:** سیستم مدیریت دانش
- **Zettelkasten / SECI / ADDIE:** مبانی دانش، یادگیری و دارایی‌سازی در مدل کاسیو

---

## وضعیت

**Repository status:** Foundation / Documentation complete  
**Implementation status:** MCP server code has not been added yet.  
**Next step:** پیاده‌سازی رسمی MCP server با TypeScript SDK و ابزارهای read-only.
