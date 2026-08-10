# بازبینی معماری و الگوریتم‌ها بر اساس چک‌لیست AlgoMaster

**تاریخ:** ۹ آگوست ۲۰۲۶
**منبع چک‌لیست:** [algomaster.io](https://www.algomaster.io) — System Design (۲۰+ الگو + مبانی) و DSA Patterns (۷۵+ الگو)
**دامنهٔ بازبینی:** کد کاسیو‌پلاس (`src/`، `operator/`) — همان‌طور که امروز هست (بعد از کامیت‌های `430818f`، `4dfe349`، `86b7584`)
**روش:** هر الگو/مبحث AlgoMaster → وضعیت در کد → شواهد → حکم (خوب / کم / عمدی)

---

## ۱. System Design — الگوها و مبانی

### ۱.۱ الگوهای اصلی (۲۰+ الگو)

| الگوی AlgoMaster | وضعیت در کاسیو | شواهد / حکم |
|---|---|---|
| **Fanout** | ✅ موجود (ساده) | `runtime.broadcast()` — `Promise.all` روی همهٔ agentها (موازی). خوب اما بدون صف/backpressure؛ فقط پیام‌رسانی درون‌پردازه‌ای |
| **Realtime Updates** | ❌ کم | هیچ WebSocket/SSE در کد نیست؛ صفحات `force-dynamic` (رندر هر بار)؛ داشبورد زنده‌ای که «هل» شود وجود ندارد |
| **High Read Traffic** | ⚠️ کافی برای مقیاس فعلی | دانش YAML یک‌بار load و در حافظه نگه داشته می‌شود؛ SQLite WAL؛ **لایهٔ کش صریح نداریم** (هیچ Redis/cache-helper)؛ در مقیاس تک‌اپراتور درست است، در مقیاس مشتری نه |
| **High Write Traffic** | ❌ آسیب‌پذیر | JSON storeها (feedback، audit، runs، metric، coaching) همگی **read-modify-write + rename** هستند: در چند instance race دارند. در یک پروسهٔ Next.js امروز قابل قبول، ولی اولین قدم به سمت چند-نود همین‌جاست |
| **Hot Keys** | ⚠️ N/A فعلاً | تک‌اپراتور؛ اگر learnerId داغ (مشتری پرمصرف) زیاد شود، نقطهٔ داغ می‌شود |
| **Caching** | ❌ کم | فقط حافظهٔ فرایند برای YAML؛ بدون TTL-cache برای summary/playbooks |
| **Sharding / Replication / Leader Election** | ❌ عمدی | تک‌نود SQLite؛ انتخاب درست برای مقیاس فعلی. وقتی cron runner و چند instance بیایند، **Leader Election** لازم می‌شود |
| **Traffic Spikes** | ❌ کم | بدون صف ورودی/rate limiting؛ ManyChat webhook مستقیم می‌نویسد (فقط یک کامنت دربارهٔ محدودیت ManyChat هست، نه پیاده‌سازی) |
| **Handling Failures** | ⚠️ نیمه | وضعیت صادقانهٔ کانکتورها + ثبت خطا در `agent_runs`/`automation-runs` ✅؛ ولی **بدون retry/backoff، circuit breaker، dead-letter** ❌ |
| **Load Balancing** | ❌ عمدی | تک‌instance؛ تا وقتی SQLite است، چند instance معنا ندارد |
| **Observability** | ❌ کم | **لاگ ساختاریافته/متریک سیستم/ردیابی نداریم**؛ آنچه هست audit دامنه (حکمرانی) و متریک کسب‌وکار (operating-metrics, agent-costs) است — نه observability سیستم |
| **Security** | ✅ قوی | SSO امضاشده (HMAC-SHA256 + timestamp + سقف ۵ دقیقه)، RBAC ۹ نقشی، fail-closed (بدون توکن در prod → refusal)، `safeEqual` زمان‌ثابت، `isPublicPath` با segment دقیق |
| **API Design** | ✅ قوی | REST + MCP + Zod در هر مرز؛ خطاهای معنادار و کد وضعیت درست (400/401/403/409) |
| **Databases** | ✅ انتخاب درست | SQLite WAL + schema در `lib/schemas.ts` (Zod روی خروجی هر row) + repo layer؛ انتخاب درست برای مقیاس فعلی |
| **Architecture Pattern** | ✅ Modular monolith | لایه‌بندی repo (داده ← repo ← schema ← route)؛ ماژول‌های pure جدا از framework (`funnel-decay`، `memory-core`، `text-similarity`) — بدون هزینهٔ میکروسرویس |
| **Deployment** | ⚠️ پایه | CI (test+typecheck+build) بدون CD؛ cron runner وعدهٔ dedicated-host |

### ۱.۲ نتیجهٔ System Design

- **خوب:** امنیت، API/validation، انتخاب دیتابیس، معماری لایه‌ای، fanout ساده، صداقت در وضعیت کانکتورها.
- **کم (اولویت‌بندی):**
  - **P0 — کش درون‌حافظهٔ ساده با TTL** برای دانش (read-heavy) — یک فایل، بدون وابستگی.
  - **P0 — retry + backoff برای کانکتورها/webhook** (اول ManyChat و email) — Handling Failures.
  - **P1 — observability پایه:** لاگ ساختاریافته + `health` عمیق (در `src/http.ts` هست، در Operator نه) + متریک سیستم.
  - **P1 — rate limiting** روی webhook عمومی ManyChat.
  - **P1 — صف نوشتن اتمیک** (یا مهاجرت JSON storeها به SQLite) برای آمادگی چند-نود.
  - **P2 — Realtime (SSE)** برای داشبوردهای زنده وقتی سمت مشتری آمد.
  - **P2 — تک‌instance lock / leader election** وقتی cron runner واقعی شد.

---

## ۲. DSA Patterns — الگوریتم‌های موجود در کد

| الگوی AlgoMaster | در کد | شواهد و حکم |
|---|---|---|
| **Frequency Counting** | ✅ | `casioMetricSummary` (شمارش green/yellow/red)، counts در agent-costs و engagement |
| **Top-K Elements** | ✅ (با sort) | `attentionQueue` در `funnel-decay.ts`: sort + `slice(0, attentionCap)` — O(n log n) به‌جای heap O(n log k)؛ در n کوچک (لیست لیدها) درست و ساده‌تر |
| **Union Find** | ✅ | `assignLinkClusters` + تشخیص کامپوننت در `memory-core.ts` (با path compression) — برای link communities و خوشه‌بندی |
| **Sliding Window** | ✅ | `growthOver` (پنجرهٔ trailing روی سری زمانی)، `funnel-decay` (daysSince روی پنجرهٔ سکوت) |
| **Greedy** | ✅ | توزیع شعاعی area-uniform (رتبه → شعاع `BLOB_FILL*sqrt(rank/n)`) و golden-angle spacing — تعیّنی و بدون حالت |
| **Hash Maps / Fingerprint** | ✅ | dedup دقیق SHA-256 + `fuzzy_duplicate` (Levenshtein محدود) در `intake-store` |
| **Sorting (تعیّنی)** | ✅ | همه‌جا: `(score, then label, then id)` — خروجی قابل پیش‌بینی و تست‌پذیر |
| **BFS/DFS** | ⚠️ ضمنی | پیمایش گراف دانش در UI (رندر حلقه‌ای) — نه به‌صورت الگوریتم صریح |
| **Intervals** | ⚠️ | `calendar-layout` (چیدمان تقویم) — overlap ساده؛ پترن کامل Intervals (merge/sweep) استفاده نشده |
| **Two Pointers / Binary Search / Monotonic Stack / DP / Backtracking** | ❌ | استفاده نشده — و درست هم هست: در nهای کوچک (≤۱۲۰ گره، صف‌های ≤۲۰۰) نیاز نبوده |

### ۲.۱ نکات خوب الگوریتمی (طبق معیار AlgoMaster: پیچیدگی + edge case)

1. **همه‌چیز bound شده است:** `maxPages=120`، `FORCE_ITERS=260`، `FUZZY_MAX_LENGTH=600`، `attentionCap=4`، limitهای ۱-۲۰۰ در صف‌ها — هیچ الگوریتم بی‌کران نیست.
2. **Early-exit:** Levenshtein با `maxDistance` (شکاف طول + قطع ردیف)؛ force layout با iteration cap.
3. **Edge cases صریح:** `decayFactor` برای config تباهیده (span ≤ 0) به‌جای NaN؛ `daysSince` تاریخ نامعتبر را throw می‌کند به‌جای «سالمِ ابدی»؛ `isEmptyValue` برای آرایهٔ خالی؛ تقسیم بر صفر در `growthAllTime` (baseline=0 → null).
4. **Determinism:** هیچ `Math.random` در الگوریتم‌های هسته نیست (golden-angle + hash-jitter به‌جای رندوم) → property tests ممکن.
5. **جداسازی pure:** الگوریتم‌ها بدون React/Zod/DB (`funnel-decay.ts`، `memory-core.ts`، `text-similarity.ts`) — مستقیم قابل تست و انتقال.
6. **پیچیدگی‌ها سنجیده:** pairwise separation در force layout O(n²)×۲۶۰iter با n≤۱۲۰ = ~۱.۸M عملیات — قابل قبول؛ اگر n رشد کند باید heap/چندریختی آورد.

---

## ۳. مقایسهٔ کوچک با GenFlow (هم‌خانواده)

| الگوی AlgoMaster | GenFlow | CasioPlus |
|---|---|---|
| Realtime Updates / Fanout | Synaptic Hub (tokio broadcast + Redis pub/sub) — کامل | broadcast ساده + بدون push |
| High Write / Sharding | PostgreSQL + RLS + tenant boundaries | SQLite تک‌نود (عمدی) |
| Handling Failures | Release با dry-run، SHA-pinning | وضعیت صادقانه + بدون retry |
| Observability | زمان‌سنجی CI/Release | متریک کسب‌وکار، بدون متریک سیستم |

پیام: الگوهایی که GenFlow دارد (event bus، مقیاس افقی) همان P2های این بازبینی‌اند؛ و الگوهایی که CasioPlus دارد (امنیت، governance، determinism) برای GenFlow مفیدند — همان دوطرفه‌ای که در `docs/genflow-casioplus-alignment.md` نوشته شد.

---

## ۴. جمع‌بندی

**چه خوب دارد (طبق معیار AlgoMaster):**
1. امنیت و API design در سطح «طراحی خوب» — نه «کافی».
2. انتخاب دیتابیس و معماری **متناسب با مقیاس** (اصل Scale-to-reality خود پروژه).
3. الگوریتم‌ها **bound، deterministic، edge-case-safe و pure** — همان‌هایی که AlgoMaster در DSA ارزش می‌گذارد.
4. Fanout و Top-K و Union Find و Sliding Window به‌صورت آگاهانه پیاده شده‌اند.

**چه کم دارد (به ترتیب ارزش/هزینه):**
1. **Caching (P0):** read-heavy است و کش صریح ندارد — کوچک‌ترین برد.
2. **Handling Failures (P0):** retry/backoff برای کانکتورها — مقاوم‌سازی بدون معماری جدید.
3. **Observability (P1):** هیچ متریک سیستم/لاگ ساختاریافته‌ای نیست؛ قبل از سمت مشتری لازم است.
4. **Write-path (P1):** JSON storeهای read-modify-write اولین مانع چند-نود شدن.
5. **Realtime (P2):** وقتی سمت مشتری آمد، SSE برای کوچینگ/متریک ضروری می‌شود.

**یک‌خطی:** از نظر DSA کاسیو «A» است (الگوریتم‌هایش تمیز و قابل دفاع‌اند)؛ از نظر System Design «B+» — ستون فقرات (امنیت/داده/لایه‌بندی) درست است، ولی لایه‌های کش، خطا، مشاهده‌پذیری و push هنوز برای مرحلهٔ «سمت مشتری» ساخته نشده‌اند. قدم بعدی پیشنهادی: اجرای دو P0 (کش + retry) در یک گام کوچک.
