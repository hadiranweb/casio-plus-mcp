# Phase 0 — Lineage تصمیم‌ها (D1–D6) + گزارش اجرا

**شاخه:** `arena/019fe771-casio-plus-mcp`
**منبع حقیقت:** `docs/spec/general_ecosystem.yaml` (spec 0.5.0)
**وضعیت:** ✅ کامل (گام‌های ۰ تا ۷)

---

## تصمیم‌های قطعی مالک سیستم

| # | تصمیم | اجرا |
|---|---|---|
| **D1** | Strangler — ساختار جدید کنار کد قدیمی؛ حذف فقط وقتی سبز شد | ✅ `src/` → `services/mcp-server/src/` با git mv؛ همهٔ تست‌ها در هر گام سبز ماندند |
| **D2** | دانش کاسیو = `legacy_evidence` با `asset_status: evidence_collected` + رکورد شاهد مهاجرت | ✅ ۵۶/۵۶ پلی‌بوک مارک خوردند + ۳ witness (`evd_migration_{knowledge,feedback,proposals}`) در `workspaces/casio/evidence/migration-witnesses.json` |
| **D3** | Codegen از YAML — `*.schema.yaml` هنجار؛ تایپ/Zod تولید می‌شود | ✅ ۱۱ primitive + `scripts/gen-schemas.ts` → `services/mcp-server/src/generated/` + تست schema-sync ضد drift + اجرا در `npm run check` |
| **D4** | HEGAM در kernel نمی‌رود؛ استاندارد ثبت‌شده در workspace کاسیو | ✅ kernel تست‌شده بدون واژهٔ «کاسیو/HEGAM»؛ دانش کاسیو فقط در `workspaces/casio/knowledge/` |
| **D5** | اتوماسیون/اثرهای بیرونی خاموش تا evidence + approval | ✅ سطح ۴ در manifest کاسیو نیست (`enabled_mcp_tool_levels: [0,1,2]`)؛ استاب‌ها با `disabled_until_evidence` پاسخ می‌دهند |
| **D6** | Operator/Studio کلاینت‌اند؛ در این فاز دست نمی‌خورند | ✅ `clients/` فقط در docs ثبت شد؛ فیزیکی جابه‌جا نشد؛ ۹۸۹ تست + `next build` سبز |

## گام‌های اجراشده

| گام | وضعیت | شواهد |
|---|---|---|
| ۰ — منبع حقیقت | ✅ | `docs/spec/general_ecosystem.yaml` + `core/VERSION` |
| ۱ — Constitution/Policies | ✅ | principles (۷ اصل idدار) + ۵ policy با id/enforcement/audit_required (تست) |
| ۲ — Primitives + Codegen | ✅ | ۱۱ schema + generated + schema-sync |
| ۳ — Bootstrap contracts | ✅ | manifest/installer/starter-pack (تست بدون محتوا) |
| ۴ — MCP contracts | ✅ | ۳۲ ابزار با قرارداد کامل + deprecated alias |
| ۵ — بازسازی server | ✅ | `services/mcp-server/src/` (kernel.ts = platform-kernel، router.ts = workspace routing، quality-gate = quality.ts، audit-log = audit-store.ts، evidence-store، workspace-store)؛ storeها workspace-aware با چیدمان `feedback/`، `registries/`، `evidence/`؛ گیت سطح در handler ها + استاب سطح ۴ |
| ۶ — مهاجرت کاسیو | ✅ | witness ها + asset_status (جراحی، بدون بازفرمت) + `dataDir: "."` + manifest `[0,1,2]` |
| ۷ — دروازهٔ آمادگی | ✅ | تست‌ها: schema-sync، conformance، idempotency، level-gate، no-fake-knowledge، migration |

## چک‌لیست آمادگی (bootstrap_readiness_checklist)

- [x] kernel_version defined — `core/VERSION` = 0.1.0
- [x] workspace manifest schema defined — `core/bootstrap/workspace-manifest.schema.yaml`
- [x] installer protocol defined — `core/bootstrap/installer-protocol.yaml`
- [x] evidence primitive defined — `core/primitives/evidence.schema.yaml` + store
- [x] MCP contracts define side effects — `core/mcp/tools.yaml` (effect_type/risk/rollback)
- [x] automation disabled by default — سطح ۴ خاموش در manifest + استاب
- [x] no-fake-knowledge policy active — `core/policies/no-fake-knowledge.yaml` + تست

## Definition of Done

1. ✅ `core/` هیچ دادهٔ سازمانی ندارد (تست grep)
2. ✅ Bootstrap workspace خالیِ هدایت‌شده می‌سازد (تست sandbox=acme)
3. ✅ کاسیو اولین workspace جدا از platform (همهٔ تست‌ها سبز)
4. ✅ اتوماسیون تا evidence+approval خاموش است (تست level-gate)
5. ✅ ریشه ۶۹ + اپراتور ۹۸۹ + `next build` operator موفق
6. ✅ این سند (lineage D1–D6) + کامیت/PR

## آمار نهایی تست

- ریشه (MCP server): **۶۹ تست / ۱۵ فایل**
- اپراتور: **۹۸۹ تست / ۱۱۶ فایل** + `next build` ✅
