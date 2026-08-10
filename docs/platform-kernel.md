# Platform Kernel · Workspace Bootstrap · Evolving Organization Memory

**«اکوسیستم عنصر» (Element Ecosystem)** — هستهٔ پلتفرم جنرال؛ هر سازمان/برند یک Workspace (جزیره) است.

## مدل سه‌لایه (از `general_ecosystem.yaml`)

```text
Layer 1: General Ecosystem Spec  (general_ecosystem.yaml + core/)
    ↓
Layer 2: Platform Kernel         (platform-kernel.yaml + services/mcp-server)
    ↓
Layer 3: Organization Workspace  (workspaces/{id}/manifest.yaml)
    ↓
Evolving Memory                (evidence → review → proposal → versioned playbook)
```

> اصل: **سیستم را پر نمی‌کنیم؛ سیستم را قادر به پر شدن می‌کنیم.**

## ۱. Platform Kernel — `core/` + `platform-kernel.yaml` + `src/platform-kernel.ts`

قانون اساسی، اجزای اولیه، سیاست‌ها و قابلیت‌های MCP — **هیچ محتوای سازمانی ندارد** (تست «بدون کاسیو/الکس»).

- `core/constitution/`: `principles.yaml` (۵ اصل), `governance.yaml` (نقش‌ها + جریان تایید), `firewall.yaml` (ایزولیشن جزایر)
- `core/primitives/`: `playbook.schema.yaml`, `template.schema.yaml`, `decision.schema.yaml`, `registry.schema.yaml`, `evidence.schema.yaml` ← مهم‌ترین, `feedback.schema.yaml`, `automation-spec.schema.yaml`
- `core/policies/`: `data-quality.yaml` (گیت کیفیت), `versioning.yaml`, `approval.yaml`, `rbac.yaml`, `no-fake-knowledge.yaml`
- `core/bootstrap/`: `workspace-manifest.schema.yaml`, `installer-protocol.yaml`, `starter-pack.yaml`
- `core/mcp/`: `tools.yaml` (۵ سطح ۰-۴), `resources.yaml`, `prompts.yaml`
- گیت قابلیت: `bootstrap_tools_enabled` (فعال از ابتدا) و `disabled_until_evidence` (خاموش تا شواهد واقعی ≥۳)

## ۲. Workspace Bootstrap — `src/workspace.ts` + `src/templates.ts` + `services/bootstrap-engine`

- `bootstrapWorkspace({id, displayName})` → ساختار زنده اما خالی: `config.json` + `manifest.yaml` + `knowledge.yaml` ظرف خالی + `evidence/` + `feedback/` + `data/workspaces/{id}/` — اتوماسیون خاموش.
- `define_domain` / `assign_owner` (Level 0) → دامنه‌ها در `manifest.yaml` با status `needs_definition`
- `create_asset_from_template` → **ظرف** پلی‌بوک/تصمیم/رجیستری/… (owner null، شواهد ۰، readiness needs_definition) — نه محتوای جعلی.
- `capture_field_observation` (Level 1) → Evidence primitive (`core/primitives/evidence.schema.yaml`) با fingerprint + fuzzy dedup
- گیت بلوغ: `evidenceCount` = بازخوردهای تاییدشده + evidenceهای accepted؛ `readiness`: bootstrap (۰) ← forming (≥۳) ← mature (≥۱۰). ابزارهای Level 4 (execute_automation, financial_action...) فقط از forming باز می‌شوند.
- نام نمایشی از `config.json`/`manifest.yaml` هر workspace می‌آید.

## ۳. Evolving Organization Memory — `src/evidence-store.ts` + `src/receptors.ts` + حلقه بازخورد

- `workspaceReceptors(ws)` سه Receptor رسمی (Knowledge / Feedback / Audit) را به storeهای همان workspace می‌بندد — همان «USB» هر جزیره. Evidence اکنون primitive جداگانه با `evidence-store.ts` است.
- چرخه حیات دانش:
  ```
  Template → Empty Workspace → Field Evidence (Level 1) → Data Cleaning (Quality Gate)
        → Review (Level 2) → Version Proposal → Approved Playbook (Level 3)
        → Execution → New Feedback → به Evidence برمی‌گردد
  ```
- قانون: دانش معتبر فقط پس از شواهد + review + approval

## Workspace ها

| id | نمایش | دانش | manifest | دادهٔ runtime | وضعیت |
|---|---|---|---|---|---|
| `casio` | کاسیو پلاس | `knowledge/casio.yaml` (در git) + `workspaces/casio/knowledge/casio.yaml` | `workspaces/casio/manifest.yaml` (۶ دامنه) | `data/` (gitignored) + `data/workspaces/casio/` | field_discovery |
| `<سازمان جدید>` | هر نامی | `workspaces/{id}/knowledge.yaml` (vessel) | `workspaces/{id}/manifest.yaml` | `data/workspaces/{id}/` | bootstrapped_empty |

## MCP Tool Levels (۵ سطح)

| Level | ابزارها |
|---|---|
| 0 Bootstrap | `create_workspace`, `define_domain`, `assign_owner`, `create_asset_from_template` |
| 1 Evidence | `capture_field_observation`, `validate_record`, `submit_feedback_intake` |
| 2 Review | `create_version_proposal`, `review_feedback`/`review_proposal`, `approve_asset` |
| 3 Execution | `publish_internal_playbook`, `sync_to_task_tool` |
| 4 Automation | `execute_approved_automation`, `mutate_crm`, `financial_action` (disabled until forming/mature) |

همه ابزارها پارامتر `workspace` دارند (پیش‌فرض: `CASIO_WORKSPACE` یا `casio`) → route به جزیره درست → validate → audit.

## ساختار ریپو (هدف)

```
core/                   ← Platform Kernel (Brand-agnostic)
services/mcp-server/    ← Synaptic Hub
services/bootstrap-engine/
services/quality-gate/
workspaces/casio/       ← اولین workspace (کاسیو)
  ├── manifest.yaml
  ├── knowledge/casio.yaml
  ├── evidence/
  ├── feedback/
  ├── registries/
  └── operations/
clients/                ← کلاینت‌ها (خود سیستم نیستند)
  ├── operator/ (mirror از operator/)
  ├── studio/ (mirror از studio/)
  ├── installer/
  └── cli/
infra/                  ← docker / kubernetes / terraform
```

## تست

۴۵+ تست ریشه (platform-kernel + workspace + templates + receptors + evidence + review) + ۹۸۹ تست اپراتور — سبز.
