# CasioPlus MCP

> **MCP server برای اکوسیستم دانش و عملیات کاسیو‌پلاس**  
> **CasioPlus MCP Server for the Casio Plus knowledge-and-operations ecosystem**

`CasioPlus MCP` یک سرور [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) است که مدل دانش، متدولوژی و دارایی‌های کاسیو‌پلاس را به ابزارهای هوش مصنوعی، عامل‌ها و هر رابط عملیاتیِ موردنیاز کاسیو متصل می‌کند.

این ریپو **فورک FounderOS نیست** و توپولوژی یا معماری کاسیو را از آن به ارث نمی‌گیرد. FounderOS صرفاً یک نمونهٔ الهام‌بخش است: نشان می‌دهد که یک نفر می‌تواند با یک UI ساده، دادهٔ ساختاریافته، Repository Layer، Agentها و اتصال‌های صادقانه، یک سیستم متناسب با نیاز خودش بسازد.

ما نیز همین اصل را برای کاسیو اجرا می‌کنیم: **یک سیستم ساده، بومی، مرحله‌ای و دقیقاً منطبق با نیازهای خود کاسیو.** نقش MCP یک لایهٔ توانمندساز است؛ دانشِ معتبر را بازیابی می‌کند، ساختار و کیفیت داده را بررسی می‌کند، و بازخورد عملیات را بدون آلودن مستقیم هستهٔ دانش به صف بررسی وارد می‌کند.

---

## اصل معماری

```text
Casio Knowledge Core                    CasioPlus MCP                  Clientهای مجاز کاسیو
────────────────────                    ─────────────                  ─────────────────────
کاسیو.yaml + Markdown       →       Tools / Resources / Prompts   →   AI / CLI / UI سبک
پلی‌بوک / رجیستری / SOP              Validation / Retrieval            فقط در صورت نیاز
منبع حقیقت دانش                       Controlled feedback intake              │
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

## اصول طراحی CasioPlus

1. **Need-first، نه framework-first:** هیچ قابلیت فقط چون FounderOS یا ابزار دیگری دارد وارد محصول نمی‌شود؛ هر قابلیت باید یک مسئلهٔ واقعی کاسیو، مالک، خروجی و مسیر بازگشت داده داشته باشد.
2. **ساده‌ترین برش قابل استفاده:** ابتدا کوچک‌ترین Tool/Resource MCP که یک کار واقعی را حل می‌کند؛ نه داشبورد یا معماری بزرگ پیش از نیاز.
3. **توپولوژی کاسیو ثابت می‌ماند:** MCP به هستهٔ دانش و معماری HEGAM خدمت می‌کند؛ آن را جایگزین یا بازچینی نمی‌کند.
4. **دانش قبل از اتوماسیون:** تا وقتی پلی‌بوک، مدل داده، مالک و معیار پذیرش روشن نشده، اتوماسیون ساخته نمی‌شود.
5. **Read-first، Write-guarded:** بازیابی دانش کم‌ریسک است؛ نوشتن، انتشار یا اجرای عملیات نیازمند گیت کیفیت، مجوز و ردپای ممیزی است.
6. **Scale to reality:** ابزار فقط به اندازهٔ پیچیدگی واقعی کاسیو رشد می‌کند؛ از YAML/Markdown شروع می‌کند و تنها هنگام نیاز به DB، Queue، RBAC یا UI بزرگ‌تر ارتقا می‌یابد.

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

## FounderOS: منبع الهام، نه قالب اجباری

FounderOS برای کاسیو‌پلاس یک **reference implementation** است، نه وابستگی معماری. از آن این الگوها را می‌آموزیم:

| الهام | تفسیر بومی برای کاسیو‌پلاس |
|---|---|
| یک سازنده، سیستم متناسب با نیاز واقعی خود ساخته است | کاسیو هم از نیازهای واقعی خودش شروع می‌کند: پلی‌بوک، کوچینگ، Casio Metric، سفیران، محتوا و حافظه دانش |
| Repository Layer | دادهٔ UI از منبع حقیقت جدا می‌ماند؛ اما قراردادها و مدل داده را خود کاسیو تعریف می‌کند |
| Seeded demo + اتصال صادقانه | توسعه مرحله‌ای با دادهٔ نمونه/واقعی کاسیو؛ هیچ اتصال یا قابلیتِ جعلی سبز نمی‌شود |
| Knowledge graph و Agent skills | گراف دانشِ پلی‌بوک‌ها و مهارت‌های Agent بر پایه HEGAM، نه مدل دامنه‌ای FounderOS |
| ابزارهای کوچک و قابل اجرا | هر قابلیت کاسیو یک ابزار کوچک، قابل آزمون و دارای خروجی روشن می‌شود |

هیچ صفحه، دیتابیس، connector، نقش سازمانی یا جریان کاریِ FounderOS به‌صورت پیش‌فرض وارد کاسیو‌پلاس نمی‌شود. هر کدام فقط زمانی ساخته/اتصال داده می‌شود که یک نیاز واقعی کاسیو، مالک مشخص، خروجی قابل سنجش و مسیر بازگشت داده داشته باشد.

اگر در آینده یک داشبورد یا ابزار عملیاتی لازم باشد، می‌تواند یک UI بومی CasioPlus یا هر ابزار دیگری باشد. MCP به یک محصول رابط خاص قفل نمی‌شود.

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

### Phase 3 — رابط‌های بومی کاسیو (فقط در صورت نیاز)
- [ ] انتخاب کوچک‌ترین رابط مفید: CLI، پنل سبک یا داشبورد بومی CasioPlus
- [ ] نمایش گراف دانش کاسیو و شکاف‌های «داریم/لازم/توسعه»
- [ ] داشبورد Casio Metric و کوچینگ، فقط پس از تثبیت قرارداد داده
- [ ] RBAC و SSO، فقط هنگام ورود نقش‌ها و داده‌های حساس واقعی

### Phase 4 — اتوماسیون کنترل‌شده
- [ ] Agent approval gate
- [ ] Automation Spec → workflow
- [ ] کانکتورهای CRM/بله/تقویم/مالی با policy کنترل‌شده

---

## توسعهٔ محلی

```bash
npm install
npm run check          # typecheck + tests
npm run start:stdio    # اجرای MCP با stdio
# یا:
npm run dev
```

### ابزارهای قابل استفاده در نسخهٔ فعلی

- `search_playbooks`
- `get_playbook`
- `get_architecture`
- `get_learning_path`

منابع MCP فعلی:

- `casio://knowledge/summary`
- `casio://playbooks/{id}`

---

## منابع مفهومی

- **HEGAM / Casio Plus:** مدل دانش داخلی کاسیو‌پلاس در `knowledge/casio.yaml`
- **FounderOS-DEMO:** https://github.com/Bennettxai/FounderOS-DEMO
- **Model Context Protocol:** https://modelcontextprotocol.io/
- **ISO 30401:** سیستم مدیریت دانش
- **Zettelkasten / SECI / ADDIE:** مبانی دانش، یادگیری و دارایی‌سازی در مدل کاسیو

---

## وضعیت

**Repository status:** Foundation + Read-only MCP complete  
**Implementation status:** TypeScript MCP server فعال است و دانش کاسیو را از `knowledge/casio.yaml` می‌خواند.  
**Next step:** Phase 2 — Data Quality Gate و Feedback Intake محلی.
