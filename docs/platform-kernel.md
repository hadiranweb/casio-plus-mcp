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
