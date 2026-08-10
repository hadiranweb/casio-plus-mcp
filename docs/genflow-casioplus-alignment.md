# مطابقت معماری، منطق و الگوریتم‌های هسته: GenFlow ↔ CasioPlus MCP

**تاریخ:** ۹ آگوست ۲۰۲۶
**روش:** مقایسهٔ لایه‌به‌لایه + تطبیق الگوریتم‌ها/منطق‌های هسته + تحلیل شکاف دوسویه
**منابع:**
- سمت GenFlow: گزارش وضعیت GenFlow (۹ آگوست ۲۰۲۶) — معماری Hybrid Island، ۸ crate، ۱۱ migration، لاگ‌های ۱۱۲ Run قبلی
- سمت CasioPlus: کاوش مستقیم کد این ریپو (`src/`، `operator/lib/`، `operator/app/api/`، `docs/`، `knowledge/casio.yaml`، ۱۱۴ فایل تست)

> فرض مهم: سمت GenFlow بر مبنای گزارش کاربر است (کد GenFlow در این ورک‌اسپیس در دسترس نیست). هر جا گزارشی وجود نداشته، به‌صراحت نوشته شده «در گزارش ذکر نشده».

---

## ۰. خلاصهٔ اجرایی

دو سیستم مکمل‌اند، نه رقیب:

| بعد | GenFlow | CasioPlus MCP |
|---|---|---|
| **مأموریت** | موتور پردازش و تطبیق کاندیدا (چند سازمان، چند سرویس) | سیستم دانش و عملیات یک سازمان (Knowledge Core + Operator) |
| **نقطهٔ قوت هسته** | ایزولاسیون، مقیاس، کارایی، پاک‌سازی و تطبیق داده | حکمرانی دانش، گراف دانش، امنیت هویت، تست‌پذیری |
| **زبان/رانتایم** | Rust (Axum) + Remix | TypeScript (Node/Next.js) + MCP SDK |
| **داده** | PostgreSQL + RLS + Redis | SQLite (WAL) + JSON stores + YAML Knowledge Core |
| **اتصال سرویس‌ها** | Synaptic Hub (tokio broadcast + Redis pub/sub) | مستقیم/همگام از طریق repo layer (بدون Event Bus) |

**پاسخ به پرسش اصلی:** بله، در هر دو جهت چیزهای قوی‌تر وجود دارد:
- **در GenFlow که CasioPlus ندارد:** ایزولاسیون چندمستاجری (RLS)، Event Bus واقعی، island به‌عنوان سرویس مستقل، موتور تطبیق چندمحوره، پاک‌سازی فازی (Levenshtein/Deunicode)، پایپ‌لاین Release کامل.
- **در CasioPlus که GenFlow ندارد:** چرخهٔ حکمرانی دانش (بازخورد→بررسی→پیشنهاد نسخه→ادغام انسانی+ممیزی)، گراف دانش با Embedding محلی (BoW→PCA→2D)، SSO امضاشده + RBAC ۹ نقشی، رجیستری اتوماسیون با Approval Gate، ۱۲ کانکتور زنده، property tests.

---

## ۱. نقشهٔ لایه‌به‌لایه (Layer Mapping)

| لایهٔ GenFlow | لایهٔ معادل در CasioPlus | نوع رابطه |
|---|---|---|
| **Gateway** (Axum، ورودی یکتای API) | **MCP Server + HTTP Bridge** (`src/server.ts` + `src/http.ts`) | همتا — هر دو یک ورودی استاندارد و کنترل‌شده |
| **Islands** (candidate-matching، data-cleaning، …) | **ماژول‌های دامنه** (`operator/lib/` — funnel، brain، memory، comms، finances، …) | همتا در مفهوم؛ متفاوت در شکل: island سرویس مستقل (پروسه/کانتینر جدا) در برابر ماژول درون‌پردازه‌ای |
| **Synaptic Hub** (tokio broadcast + Redis pub/sub) | **ندارد** — فقط `runtime.broadcast()` (پیام به Agentها) + `cron.ts` (تعریف cron؛ runner هنوز در دیپلوی dedicated-host) | شکاف ساختاری |
| **Shared Infra** (DB, Redis, Auth, Error) | **Repo Layer** (`lib/db.ts` با better-sqlite3 + `lib/schemas.ts` با Zod + `lib/auth.ts` + `lib/sso.ts`) | همتا؛ عمق متفاوت |
| **Receptors / کانکتورهای ورودی** | **۱۲ گروه کانکتور زنده** (`lib/connectors/`: email×4 IMAP، slack، stripe، notion، gbrain، zernio، attio، arcads، miro، wispr، obsidian، local-stack) | CasioPlus از نظر تنوع ورودی واقعی جلوتر است |
| **مigrations + RLS + tenant boundaries** (۱۱ migration) | **ندارد** — تک‌اپراتوری عمدی («is this instance yours») | شکاف (طراحی عمدی) |
| **Frontend** (Remix + Vite + Tailwind + RTL Vazirmatn) | **Operator** (Next.js 14 App Router) + **Studio** (Vite/PWA) + i18n فارسی | همتا؛ هر دو RTL فارسی دارند |
| **CI/CD + Release** (fmt/clippy/test، dry-run، تگ semantic، GHCR، distroless) | **CI پایه** (`operator/.github/workflows/ci.yml`: test + typecheck + build، بدون دیپلوی) | GenFlow از نظر پایپ‌لاین Release جلوتر است |
| **تست** (unit + integration با `#[ignore]`، clippy) | **۱۱۴ فایل تست**، TDD، property tests | CasioPlus از نظر کمیت/سبک جلوتر است |

---

## ۲. تطبیق الگوریتم‌ها و منطق‌های هسته (Core Logic & Algorithms)

### ۲.۱ پاک‌سازی و کیفیت داده

| | GenFlow | CasioPlus |
|---|---|---|
| **لایه** | island `data-cleaning` (۳ ماژول، ۴۲۱ خط) | `src/quality.ts` — Data Quality Gate |
| **Missing values** | `missing.rs`: `FillStrategy` (Mean/Median/Constant) + `group_impute(group_key, group_means, overall_mean)` — **ترمیم می‌کند** | فقط هشدار/خطا («زمان رخداد ثبت نشده»، «خلاصه کوتاه است») — **ترمیم نمی‌کند** |
| **Duplicate** | `duplicates.rs`: `DuplicateKey {normalized_email, position_id}` + `dedup_candidates(keep='last')` | Fingerprint SHA-256 با نرمال‌سازی (trim/lowercase/جمع‌کردن فاصله‌ها) در `fingerprintOf` |
| **نوع dedup** | فازی + کلیدی ترکیبی (ایمیل+موقعیت) | دقیق (hash) — بدون آستانهٔ شباهت |
| **Inconsistency** | `inconsistency.rs`: `deunicode` + `regex` + `strsim::normalized_levenshtein` → `fuzzy_match_skill("React.js", dict, 0.8)` | Zod schema + فهرست منابع شناخته‌شده (`knownSourceSystems`) — بدون تطبیق فازی متن |
| **نرمال‌سازی** | `normalize_email()/normalize_name()` | trim + lowercase در fingerprint |
| **خروجی** | رکورد تمیز → ورودی موتور تطبیق | رکورد `validated`/`quarantined`/`rejected` → صف بررسی انسانی |
| **حکمرانی** | در گزارش ذکر نشده (قوانین در کد) | کامل: منشأ (provenance)، ممیزی، بررسی انسانی، پیشنهاد نسخه |

**خوانش:** GenFlow «داده را اصلاح می‌کند» (جانشینی، ادغام، فازی)، CasioPlus «داده را قضاوت می‌کند» (گیت ورود + بازخورد انسانی). ترکیب ایده‌آل: گیت CasioPlus بعد از تمیزکاری GenFlow — تمیز کن، بعد اعتبارسنجی کن، بعد برای تغییر دانش به انسان ارجاع بده.

### ۲.۲ امتیازدهی و تطبیق (Scoring / Matching)

| | GenFlow | CasioPlus |
|---|---|---|
| **مدل** | موتور تطبیق ۵‌محوره (Big Five + …) → Capability composite با وزن | `CasioMetric.actionScore` (تک‌عدد ۰-۱۰۰) + `statusForScore` (≥۷۰ سبز، ≥۴۰ زرد، غیره قرمز) |
| **ورودی** | پروفایل کاندیدا + Big Five (Option) + مهارت‌ها | رکورد یادگیرنده + score از منبع (coaching، …) |
| **پیش‌پردازش** | Group Impute روی Big Five → composite ۴۵٪ → ۶۸٪ → Auto Pass | بدون پیش‌پردازش آماری |
| **تصمیم** | آستانهٔ `human_review_required` → Auto Pass / بررسی کارشناس | ترجمهٔ score به وضعیت اسمی (سبز/زرد/قرمز) برای داشبورد |
| **موارد تکمیلی** | — | `readinessScore` کوچینگ (۱-۱۰) + `coachingSummary` (open/blocked actions) |

**خوانش:** CasioPlus در «سادگی قابل دفاع» قوی است (یک عدد، وضعیت واضح، بدون جعبهٔ سیاه)؛ GenFlow در «دقت چندبعدی» قوی است. شکاف واقعی CasioPlus: امتیاز ترکیبی چندمنبعی وجود ندارد — `actionScore` از یک منبع می‌آید.

### ۲.۳ هماهنگی و رویداد (Eventing)

| | GenFlow | CasioPlus |
|---|---|---|
| **مکانیزم** | Synaptic Hub: tokio broadcast (درون‌پردازه‌ای) + Redis pub/sub (بین‌پردازه‌ای) | همگام و مستقیم: هر route → repo layer → SQLite |
| **الگو** | Event-driven بین islands | Request/Response خالص + cron (تعریف‌شده، runner در آینده) |
| **ردپا** | در گزارش ذکر نشده | `agent_runs`، `broadcasts`، `automation-runs` (لاگ کامل اجرا) |
| **ریسک** | پیچیدگی توزیع‌شده (نیاز به Redis، مدیریت خطا) | سادگی؛ اما ماژول‌های سنگین (brain، funnel، comms) به هم گره می‌خورند — بدون صف رویداد برای «اتفاق افتاد → عکس‌العمل» |

**خوانش:** اگر CasioPlus قرار است «اتصال صادقانه» به سرویس‌های بیرونی را به جریان‌های داخلی تبدیل کند (مثل: رویداد Stripe → به‌روزرسانی funnel + پیام به agent)، به یک صف رویداد سبک نیاز دارد — الگوی Synaptic Hub را می‌توان با Redis یا حتی outbox جدول SQLite تقلید کرد.

### ۲.۴ دانش و گراف (Knowledge & Graph)

| | GenFlow | CasioPlus |
|---|---|---|
| **منبع دانش** | قوانین مستخرج از PDF (Data Cleaning Handbook) — سخت‌کدشده در island | `knowledge/casio.yaml` (مدل HEGAM: ۵۶ پلی‌بوک، ۹ نقش، ۴ سطح، برچسب داریم/لازم/توسعه) + Markdown |
| **گراف دانش** | در گزارش ذکر نشده | `knowledge-graph.ts`: ۵ حلقه (self → teams → tasks → workers → tools) + قانون تک‌همسری task→worker |
| **Embedding** | در گزارش ذکر نشده | `brain-graph.ts`: Markdown → chunk (~۱۲۰ کلمه) → hashed bag-of-words → PCA → ۲D (پروکسی تعیین‌کننده برای بردارهای واقعی ZeroEntropy) + cosine kNN (لبه‌های `similar`) |
| **جست‌وجو** | در گزارش ذکر نشده | `memory-search.ts`: رتبه‌بندی طبقه‌ای (prefix > substring > folder > excerpt)، قطعی |
| **تجسم** | در گزارش ذکر نشده | `memory-core.ts`: force-directed layout قطعی (spring با وزن per-edge، pairwise separation، لنگر golden-angle، توزیع شعاعی area-uniform، union-find برای link communities، orphan halo) + دوربین سینمایی (`cameraRect`/`lerpRect`) |

**خوانش:** این بزرگ‌ترین برتری CasioPlus است. GenFlow «قانون» دارد، CasioPlus «دانش ساخت‌یافته + گراف + بردار» دارد. اگر GenFlow بخواهد matching را «قابل توضیح» کند (چرا این کاندیدا ۸۵٪ شد؟)، الگوی گراف/embedding کاندیداها مستقیم قابل انتقال است.

### ۲.۵ حکمرانی دانش (Knowledge Governance)

| | GenFlow | CasioPlus |
|---|---|---|
| **تغییر دانش** | تغییر در کد + PR (در گزارش) | ممنوعیت write مستقیم به `casio.yaml` |
| **چرخه** | — | `submit_feedback_intake → validate_record → queue → review_feedback → version_proposal → pending_human_merge → ادغام نسخه‌ای Git` |
| **ممیزی** | — | `audit-store.ts`: هر approve/reject/proposal یک رویداد ممیزی + `baseKnowledgeVersion` روی هر proposal |
| **قانون کلیدی** | — | فقط رکورد `validated` تأیید می‌شود؛ `quarantined` فقط رد/اصلاح |

**خوانش:** GenFlow «اصل بازگشت داده» را در معماری دارد (طبق کاسیو) ولی در گزارش خبری از حلقهٔ بازخورد نسخه‌دار نیست. CasioPlus این را کامل دارد — و دقیقاً همان «بازخورد میدان» است که گزارش GenFlow برای بهبود threshold ها به آن نیاز دارد.

### ۲.۶ ایزولاسیون و چندمستاجری

| | GenFlow | CasioPlus |
|---|---|---|
| **مدل** | PostgreSQL RLS + tenant boundaries + ۱۱ migration | Single-operator عمدی — بدون جدول tenant، بدون user account |
| **تست** | `authorization_matrix.rs`: admin ALLOW همه، analyst DENY Invitation، representative DENY PositionGen؛ تست Tenant Escape (analyst_A نباید ORG_B را ببیند؛ تمایز 400/403) | `rbac.test.ts` + `auth.test.ts` + `sso` |
| **فلسفه** | چند Org روی یک استقرار | «این نمونه مالِ کیست» — یک توکن مشترک |

**خوانش:** اگر CasioPlus قرار است برای چند مشتری/سازمان مستقر شود، RLS الگوی درست است؛ اما تا وقتی تک‌اپراتوری است، اضافه‌کردن tenant لایه، پیچیدگی بی‌بازده است. این تفاوت «طراحی‌شده» است نه «نقص».

### ۲.۷ احراز هویت و مجوز (AuthN/Z)

| | GenFlow | CasioPlus |
|---|---|---|
| **AuthN** | Shared Token (طبق گزارش) | **SSO Adapter** (`sso.ts`): هدرهای امضاشده با HMAC-SHA256 + timestamp (سقف ۵ دقیقه) + `timingSafeEqual`؛ حالت local فقط در dev |
| **AuthZ** | نقش‌ها: admin / analyst / representative | **RBAC ۹ نقشی HEGAM** (`rbac-types.ts`): system_architect…viewer با ۷ permission صریح (`read:knowledge`, `write:metric`, `review:feedback`, `approve:proposal`, `execute:automation`, `manage:access`, `write:coaching`) |
| **Enforcement** | در gateway (طبق گزارش) | `requirePermission()` به‌صورت middleware در هر route؛ fail-closed در production (بدون توکن → refusal، نه open) |
| **نکتهٔ ظریف** | تست 400-vs-403 برای تشخیص باگ inconsistency | `safeEqual` دستی (constant-time) چون edge runtime ندارد `node:crypto`؛ `isPublicPath` با segment دقیق (جلوگیری از `/unlocked-secrets`) |

**خوانش:** CasioPlus از نظر عمق AuthN/Z (امضا، fail-closed، ۹ نقش) جلوتر است؛ GenFlow از نظر ایزوله‌کردن دادهٔ tenant جلوتر است. ترکیب: ماتریس نقش×permission×tenant.

### ۲.۸ اتوماسیون

| | GenFlow | CasioPlus |
|---|---|---|
| **اتوماسیون CI/CD** | Release workflow: dry_run → real، تگ semantic (v2.0.2/v2.0.3)، GHCR، SHA-pinning، Docker distroless | CI پایه: test + typecheck + build (بدون دیپلوی) |
| **اتوماسیون دامنه** | در گزارش ذکر نشده | **Automation Spec Registry**: `draft → pending_approval → approved/rejected` + `assertExecutable()` + `requiredPermission` + validation ورودی + `automation-runs.json` (لاگ completed/blocked) |

**خوانش:** GenFlow پایپ‌لاین «انتشار نرم‌افزار» را حرفه‌ای دارد؛ CasioPlus حکمرانی «اجرای اتوماسیون کسب‌وکار» را دارد (spec محور: ورودی/خروجی/خطا/معیار پذیرش). این دو مکمل‌اند: همان spec registry می‌تواند برای islandهای GenFlow workflow بسازد.

### ۲.۹ پایش و تحلیل عملیاتی

| | GenFlow | CasioPlus |
|---|---|---|
| متریک‌ها | زمان CI/Release، حجم تصویر (~۳۵MB) | `operating-metrics.ts`، `pulse-history.ts`، `posting-activity.ts`، `engagement.ts`، `agent-costs.ts`، `ledger.ts`، `bank-statements.ts`، `statements.ts` |
| گراف‌های تجسم | در گزارش ذکر نشده | `pillar-radar.ts`، `neural-layout.ts`، `tree-layout.ts`، `graph-lens.ts`، `calendar-layout.ts`، `funnel-radial.ts` — همه pure و تست‌شده |

### ۲.۱۰ تست و کیفیت کد

| | GenFlow | CasioPlus |
|---|---|---|
| کمیت | clippy + fmt + test در CI (۱۹-۲۳s) | ۱۱۴ فایل تست + TDD («فیل تست اول، بعد پیاده‌سازی») |
| سبک | `#[ignore]` برای integration زنده | **Property test** در `funnel-decay.test.ts` (همهٔ configها و روزهای سکوت) + `CASIOPLUS_DB=:memory:` |
| گیت CI | `-D warnings` (موقتاً `-A`) | `npm test` + `npm run typecheck` + `npm run build` همگی الزامی |

---

## ۳. خلاصهٔ «چه چیزی در کدام قوی‌تر است»

### ۳.۱ در GenFlow قوی‌تر — در CasioPlus نیست یا ضعیف است

| # | قابلیت | چرا مهم است |
|---|---|---|
| 1 | **ایزولاسیون چندمستاجری (RLS + tenant boundaries)** | امنیت داده بین سازمان‌ها؛ CasioPlus عمداً تک‌اپراتوری است |
| 2 | **Event Bus (Synaptic Hub: tokio broadcast + Redis pub/sub)** | اتصال ناهمگام سرویس‌ها؛ CasioPlus فقط همگام است |
| 3 | **Island به‌عنوان سرویس مستقل** | استقرار/مقیاس/تست جدا؛ در CasioPlus ماژول‌ها درون‌پردازه‌ای‌اند |
| 4 | **موتور تطبیق چندمحوره (۵-axis composite + imputation)** | دقت تصمیم در برابر دادهٔ ناقص؛ CasioPlus تک‌عدد ساده دارد |
| 5 | **پاک‌سازی فازی (Levenshtein + Deunicode + regex)** | تشخیص `React.js/ری‌اکت/reactjs`؛ dedup فازی؛ CasioPlus فقط hash دقیق دارد |
| 6 | **پایپ‌لاین Release واقعی** (dry-run، تگ semantic، GHCR، distroless ~۳۵MB، SHA-pinning) | تحویل قابل اعتماد؛ CasioPlus CI بدون دیپلوی است |
| 7 | **عملکرد Rust + تصویر سبک** | برای حجم بالای پردازش کاندیدا |

### ۳.۲ در CasioPlus قوی‌تر — در GenFlow نیست (در گزارش)

| # | قابلیت | چرا مهم است |
|---|---|---|
| 1 | **Knowledge Core + چرخهٔ حکمرانی دانش** (intake → review → proposal → merge انسانی + audit + baseKnowledgeVersion) | دانش «زنده» می‌ماند و نسخه‌دار تغییر می‌کند؛ GenFlow قوانین را در کد دارد |
| 2 | **گراف دانش + Embedding محلی** (BoW→PCA→2D + cosine kNN) + تجسم قطعی (force layout، community detection) | قابلیت توضیح‌پذیری و جست‌وجوی معنایی؛ GenFlow در گزارش فاقد آن است |
| 3 | **SSO امضاشده (HMAC-SHA256 + timestamp) + RBAC ۹ نقشی HEGAM + fail-closed** | عمق امنیت هویت بالاتر از Shared Token |
| 4 | **Automation Spec Registry با Approval Gate و Run Log** | اتوماسیون «حکمرانی‌شده» (draft→approve→execute) |
| 5 | **۱۲ کانکتور زنده با وضعیت صادقانه** (هرگز fake connected) | «اتصال صادقانه» — الگویی که GenFlow برای منابع کاندیدا می‌تواند کپی کند |
| 6 | **Property tests + ۱۱۴ فایل تست + TDD** | تضمین رفتار روی کل فضای پیکربندی (مثل decay) |
| 7 | **الگوریتم‌های pure جداشده از فریم‌ورک** (`funnel-decay.ts` بدون React/Zod/DB) | قابل استفاده مجدد روی هر CRM واقعی |
| 8 | **عمق دامنهٔ عملیاتی** (ledger، bank statements، social، comms triage، coaching، funnel ۵ مرحله‌ای، life-map) | پوشش واقعی روزمرهٔ یک کسب‌وکار |

---

## ۴. نقشهٔ انتقال دوسویه (Port Map)

### ۴.۱ از GenFlow → CasioPlus (پیشنهاد برای CasioPlus)

| اولویت | انتقال | تلاش |
|---|---|---|
| P1 | **Dedup فازی + نرمال‌سازی متن** به Quality Gate (`quality.ts`): اضافه‌کردن آستانهٔ Levenshtein به کنار fingerprint دقیق (الگوی `fuzzy_match_skill`) — ایمیل‌های `HADI@` و `hadi@` و `Hadi @` یکی شوند | ۲-۳ ساعت |
| P1 | **Group Imputation** برای `CasioMetric`/کوچینگ: اگر score یادگیرنده Missing بود، میانگین گروه (دوره/منبع) — دقیقاً `group_impute` | ۲ ساعت |
| P2 | **Composite scoring چندمحوره**: `actionScore` ← ترکیب وزن‌دار (readinessScore کوچینگ + engagement + حضور جلسات) — الگوی ۵-محور GenFlow | نیم روز |
| P2 | **صف رویداد سبک**: جدول outbox در SQLite یا Redis pub/sub برای اتصال رویدادهای کانکتورها به ماژول‌ها (شبیه Synaptic Hub) | نیم روز |
| P3 | **لایهٔ tenant** (الگوی RLS) فقط اگر چندسازمانه شدن تصمیم گرفته شود — فعلاً نه | — |

### ۴.۲ از CasioPlus → GenFlow (پیشنهاد برای GenFlow)

| اولویت | انتقال | تلاش |
|---|---|---|
| P1 | **حلقهٔ بازخورد نسخه‌دار برای islandها**: بعد از هر تصمیم matching (Auto Pass / human_review)، یک رکورد feedback با منشأ بساز → صف بررسی → پیشنهاد تغییر threshold ها → ادغام انسانی. مدل: intake-store + proposal-store + audit-store | ۳-۴ ساعت |
| P1 | **گراف دانش کاندیدا/سازمان** + embedding محلی (الگوی BoW→PCA→2D با fallback صادقانه) — برای توضیح‌پذیری «چرا ۸۵٪؟» | نیم روز |
| P2 | **SSO adapter** (هدر امضاشده + timestamp) به‌جای Shared Token برای چند استقرار | ۲-۳ ساعت |
| P2 | **Property tests** روی decay/threshold های matching engine (تست تمام configها — الگوی `funnel-decay.test.ts`) | ۲ ساعت |
| P3 | **لایهٔ کانکتور با وضعیت صادقانه** برای منابع دادهٔ کاندیدا (هرگز fake connected — الگوی `connectors/`) | ۳-۴ ساعت |

---

## ۵. جمع‌بندی

1. **دو فلسفهٔ مکمل:** GenFlow یک **موتور** است (سرعت، ایزولاسیون، پردازش دادهٔ حجیم چند Org)؛ CasioPlus یک **سیستم دانش و عملیات** است (حکمرانی، گراف، بازخورد انسانی، اتصال صادقانه). «قوی‌تر» بدون توجه به مأموریت بی‌معناست.
2. **بزرگ‌ترین شکاف CasioPlus:** فقدان event bus و تمیزکاری فازی و scoring چندمحوره — هر سه الگوی آماده در GenFlow دارند.
3. **بزرگ‌ترین شکاف GenFlow:** فقدان حلقهٔ بازخورد نسخه‌دار (دانش سخت‌کدشده در کد) و فقدان گراف/embedding برای توضیح‌پذیری — هر دو الگوی آماده در CasioPlus دارند.
4. **هم‌افزایی پیشنهادی:** island داده‌تمیز GenFlow به‌عنوان «لایهٔ تمیزکننده» قبل از Quality Gate کاسیو، و چرخهٔ intake/review کاسیو به‌عنوان «لایهٔ یادگیری» بعد از decisions موتور GenFlow — یک خط لولهٔ کامل: **raw → clean (GenFlow) → validate (CasioPlus) → decide (GenFlow) → feedback → learn (CasioPlus)**.
