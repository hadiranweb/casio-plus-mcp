# Platform Kernel · Workspace Bootstrap · Evolving Organization Memory

**«اکوسیستم عنصر» (Element Ecosystem)** — هستهٔ پلتفرم جنرال؛ هر سازمان/برند یک Workspace (جزیره) است.

## مدل سه‌لایه

```text
Platform Kernel                 ← ثابت، غیرسازمانی (این ریپو)
        ↓
Workspace Bootstrap             ← شروع‌کننده: خالی اما هدایت‌شده (بدون دادهٔ جعلی)
        ↓
Evolving Organization Memory    ← با شواهد واقعی میدان ساخته می‌شود
```

> اصل: **سیستم را پر نمی‌کنیم؛ سیستم را قادر به پر شدن می‌کنیم.**

## ۱. Platform Kernel — `platform-kernel.yaml` + `src/platform-kernel.ts`

قانون اساسی، اجزای اولیه، سیاست‌ها و قابلیت‌های MCP — **هیچ محتوای سازمانی ندارد** (تست این را تضمین می‌کند: «بدون کلمهٔ کاسیو/الکس»).

- constitution: ۵ قانون (مالک/نسخه/بازگشت داده، گیت کیفیت، Approval، Proposal/Review، پرنشدن با دادهٔ جعلی)
- primitives: playbook, template, decision, registry, workflow_map, data_model, automation_spec, feedback_intake, version_proposal
- policies: data_quality_gate, rbac, sso_adapter, audit_log, approval_gate, measurement_closure
- گیت قابلیت: `bootstrap_tools_enabled` (فعال از ابتدا) و `disabled_until_evidence` (خاموش تا شواهد واقعی)

## ۲. Workspace Bootstrap — `src/workspace.ts` + `src/templates.ts`

- `bootstrapWorkspace({id, displayName})` → ساختار زنده اما خالی: statusهای needs_definition، `knowledge.yaml` ظرف خالی، `data/workspaces/<id>/` برای state، اتوماسیون خاموش.
- `create_asset_from_template` → **ظرف** پلی‌بوک/تصمیم/رجیستری/… (owner null، شواهد ۰، readiness needs_definition) — نه محتوای جعلی.
- گیت بلوغ: `evidenceCount` = بازخوردهای تأییدشدهٔ واقعی؛ `readiness`: bootstrap (۰) ← forming (≥۳) ← mature (≥۱۰). ابزارهای حساس (execute_automation، financial_action و…) فقط از forming باز می‌شوند.
- نام نمایشی از `config.json` هر workspace می‌آید → هر استقرار می‌تواند نام خودش را بگذارد.

## ۳. Evolving Organization Memory — `src/receptors.ts` + حلقهٔ بازخورد

- `workspaceReceptors(ws)` سه Receptor رسمی (Knowledge / Feedback / Audit) را به storeهای همان workspace می‌بندد — همان «USB» هر جزیره.
- چرخه: مشاهدهٔ میدان → Feedback Intake → Data Quality Gate → Review → Proposal → ادغام انسانی → نسخهٔ جدید → اجرای بهتر → بازخورد جدید.

## Workspace ها

| id | نمایش | دانش | دادهٔ runtime | وضعیت |
|---|---|---|---|---|
| `casio` | کاسیو پلاس | `knowledge/casio.yaml` (در git) | `data/` (gitignored) | active |
| `<سازمان جدید>` | هر نامی | `workspaces/<id>/knowledge.yaml` | `data/workspaces/<id>/` | بوت‌استرپ‌شده |

## MCP (Hub)

همهٔ ابزارها پارامتر `workspace` دارند (پیش‌فرض: `CASIO_WORKSPACE` یا `casio`) → route به جزیرهٔ درست → validate → audit. ابزارهای جدید: `create_workspace`، `list_workspaces`، `workspace_readiness`، `create_asset_from_template`.

## تست

۳۷ تست ریشه (شامل platform-kernel/workspace/templates/receptors) + ۹۸۹ تست اپراتور — سبز.

---

## افزودنی اسپرینت ۰ (General Ecosystem Spec)

- **لایه ۱:** `general_ecosystem.yaml` (spec 0.5.0) — معماری جنرال مستقل از برند.
- **لایه ۲ (core/):** constitution (principles/governance/firewall)، primitives (۷ schema از جمله evidence)، policies (quality/versioning/approval/rbac/no-fake-knowledge)، bootstrap (workspace-manifest/installer-protocol/starter-pack)، mcp (tools با سطح ۰-۴، resources، prompts).
- **Tool Levels 0-4:** `core/mcp/tools.yaml` + `loadKernelTools()`؛ گیت سطح: ابزار سطح N فقط اگر N ≤ enabledToolLevels workspace.
- **Workspace Manifest:** `workspaces/<id>/manifest.yaml` (شناسنامه هر برند؛ bootstrap آن را می‌نویسد).
- **Evidence primitive:** `src/evidence-store.ts` + `capture_field_observation`/`list_evidence`/`triage_evidence`؛ شواهد پذیرفته‌شده در آمادگی workspace شمرده می‌شود.
- **ابزارهای سطح ۰:** `define_domain`، `assign_owner`.
- **مهاجرت:** `knowledge/casio.yaml` → `workspaces/casio/knowledge/casio.yaml` (git mv؛ DEFAULT_KNOWLEDGE_PATH به‌روز شد) + پوشه‌های scaffold (operations/evidence/registries/feedback با .gitignore) + `manifest.yaml` کاسیو.

---

## Phase 0 — گام‌های ۰ تا ۴ (سند اجرا)

| گام | وضعیت | جزئیات |
|---|---|---|
| ۰ — منبع حقیقت | ✅ | `docs/spec/general_ecosystem.yaml` (spec 0.5.0) + `core/VERSION` (kernel 0.1.0 / spec 0.5.0) |
| ۱ — Constitution/Policies | ✅ | principles با ۷ اصل idدار + immutable rules؛ ۵ policy با `id/enforcement/audit_required` (تست conformance) |
| ۲ — Primitives + Codegen | ✅ | ۱۱ فایل `*.schema.yaml` با گرامر ثابت (fields/lifecycle/validity_rules) + `scripts/gen-schemas.ts` → `services/mcp-server/src/generated/{types,schemas}.ts`؛ اجرا در `npm run check`؛ تست schema-sync ضد drift |
| ۳ — Bootstrap contracts | ✅ | workspace-manifest/installer-protocol/starter-pack؛ تست «بدون محتوای پیش‌فرض» |
| ۴ — MCP contracts | ✅ | tools.yaml با قرارداد کامل (effect_type/risk_level/approval_required/audit_required/evidence_threshold/rollback_strategy) + `review_feedback` به‌عنوان deprecated alias و `review_proposal` (۲) + `approve_asset` (۳)؛ تست conformance |
| ۵ — بازسازی server (services/) | ✅ | `src/` → `services/mcp-server/src/` (git mv)؛ storeها workspace-aware با چیدمان feedback/registries/evidence؛ گیت سطح در handler ها + استاب سطح ۴؛ `assertToolEnabled` + idempotency |
| ۶ — مهاجرت کاسیو | ✅ | ۳ witness (`migration_legacy`، origin pre-kernel، confidence 0.9، accepted) + ۵۶/۵۶ asset_status (جراحی، بدون بازفرمت) + `dataDir: "."` + manifest `[0,1,2]` |
| ۷ — دروازهٔ آمادگی | ✅ | تست‌های idempotency/level-gate/migration + چک‌لیست کامل + `docs/phase0-decisions.md` (D1–D6) |

## ساختار نهایی (پس از گام ۵)

```text
services/mcp-server/src/   ← MCP server (بازسازی از src/)
  kernel.ts (platform-kernel) · router (workspace) · quality-gate · audit-log ·
  evidence-store · workspace-store · generated/ · server.ts · migration.ts
core/                      ← Platform Kernel (بدون دادهٔ سازمانی)
workspaces/casio/          ← اولین workspace (manifest + knowledge + evidence/feedback/registries)
clients/operator, studio   ← کلاینت‌ها (در docs ثبت شدند؛ فیزیکی جابه‌جا نشدند)
```

---

## هویت و سطوح دسترسی (RBAC در لایهٔ اکوسیستم)

- `core/policies/rbac.yaml` — منبع هنجار: ۹ نقش HEGAM، ۹ مجوز (شامل `write:knowledge` و `write:evidence`)، ماتریس `role_permissions`، مجوزهای حساس.
- `core/mcp/tools.yaml` — هر ابزار `required_permission` دارد (تست conformance الزامی).
- `services/mcp-server/src/actor.ts` — هویت: هدرهای SSO امضاشده (HMAC-SHA256 + timestamp ≤۵ دقیقه + workspace scope) یا fallback محلی (`CASIO_ACTOR_ROLE`/`CASIO_ACTOR_WORKSPACE`؛ dev پیش‌فرض system_architect؛ production بدون SSO خطا).
- `services/mcp-server/src/access.ts` — `can` / `canTool` / `requirePermission` / `assertWorkspaceAccess` (ایزولاسیون tenant: actor مقیّد فقط workspace خودش، مگر manage:access).
- اعمال: bridge هر مسیر را با `permissionForRoute` بررسی می‌کند (403 برای رد)؛ ابزارهای نوشتنی MCP نیز با `authorizeTool` گیت می‌شوند.
