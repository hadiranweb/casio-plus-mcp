# عنصر پلاس · Element Plus

> شبکه‌ای از **Island**های نسخه‌پذیر که مسئلهٔ خام کاربر را به دانش ساختاریافته، فرایند قابل اجرا، اجرای کنترل‌شده و دارایی‌های قابل استفادهٔ مجدد تبدیل می‌کند.

این repository در حال ساخت تدریجی مطابق specification معماری Element Plus v0.1.0 است. Sprint 00 فقط foundation و مرزهای معماری را ایجاد می‌کند؛ هیچ قابلیت محصول، هویت، runtime زنده یا integration خارجی هنوز پیاده‌سازی نشده است.

## مفاهیم اصلی

- **Island (جزیره):** مرز capability قابل آدرس‌دهی و نسخه‌پذیر با قرارداد ورودی/خروجی، policy اختیار و policy حافظه. Island با Agent، Process، Workspace یا service برابر نیست.
- **Founder:** مسیر هدایت‌شده‌ای که مسئلهٔ خام را حفظ و در Structured Problem Solving به `ProblemSpecification` قابل تأیید کاربر تبدیل می‌کند.
- **OpenClaw:** یک `RuntimeAdapter` قابل جایگزینی است؛ پلتفرم Element Plus نیست و شناسه، اختیار، audit یا دانش canonical را تعریف نمی‌کند.
- **دادهٔ خصوصی:** دادهٔ خام کاربر به‌صورت پیش‌فرض private است. Evidence، Memory و Knowledge مفاهیم مجزا هستند و Knowledge canonical فقط از مسیر review/versioning ارتقا می‌یابد.

## وضعیت پیاده‌سازی

| سطح                             | وضعیت Sprint 00             |
| ------------------------------- | --------------------------- |
| Monorepo و package boundaries   | IMPLEMENTED                 |
| Web skeleton و health endpoint  | IMPLEMENTED                 |
| Environment validation          | IMPLEMENTED                 |
| Domain contracts/lifecycles     | NOT IMPLEMENTED — Sprint 01 |
| PostgreSQL, identity, workspace | NOT IMPLEMENTED — Sprint 02 |
| OpenClaw integration            | NOT IMPLEMENTED             |

## ساختار

```text
apps/web/                 Next.js UI and local health surface
apps/api/                 HTTP transport boundary placeholder
packages/domain/          Pure canonical domain boundary
packages/contracts/       Versioned schemas/manifests boundary
packages/application/     Use-case and port boundary
packages/{persistence,founder,runtime,knowledge,assets,connectors,observability}/
workers/{execution,jobs}/
adapters/{openclaw,llm,connectors,storage}/
infra/local/              Local PostgreSQL composition
infra/migrations/         Reserved immutable migration directory
tests/contracts/          Contract test location
```

Dependency direction points inward: apps/workers/adapters call application; application uses domain/contracts. `packages/domain` must not import Next.js, React, database drivers, OpenClaw, or provider SDKs. A guard test enforces this restriction.

## Local setup

### Prerequisites

- Node.js 22 LTS or later
- Corepack (bundled with supported Node versions)
- Docker Compose, only when PostgreSQL is needed in Sprint 02+

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. The health surface is available at `GET /api/health`.

Start local PostgreSQL when persistence work is introduced:

```bash
docker compose -f infra/local/docker-compose.yml up -d
```

No migrations exist yet. Sprint 02 will add versioned migrations; migrations must be added as new immutable files under `infra/migrations/` and applied through the documented migration command introduced in that sprint.

## Runtime configuration

The default local mode is safe and deterministic:

```dotenv
ELEMENT_PLUS_RUNTIME_MODE=fake
```

`fake` is the only implemented runtime mode in this foundation. Set `ELEMENT_PLUS_RUNTIME_MODE=openclaw` only after the OpenClaw adapter is implemented and configured in a later sprint. `OPENCLAW_BASE_URL` is intentionally optional today and must never contain secrets.

## Validation

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Internal PostgreSQL verification exception

The identity and workspace implementation includes a versioned PostgreSQL migration, repository adapter, server-side authorization, and application-service tests. Live migration and PostgreSQL HTTP integration verification are not run in the Arena sandbox because it has no PostgreSQL client, server, Docker daemon, or configured `DATABASE_URL`. They remain required before a deployment is represented as live-verified; they are not represented as passing from this repository alone.

## CI publication exception

The Sprint 00 CI workflow is intentionally not committed at this time. The GitHub App available to this repository does not have permission to create or update files in `.github/workflows/`; GitHub rejects such pushes. Local validation remains mandatory and is documented above. A GitHub Actions workflow can be added when a repository credential with `workflows` permission is available.

## Security and truthfulness

- Authorization is designed to default to deny; authentication and authorization behavior arrives in Sprint 02.
- No external effect is implemented in Sprint 00.
- Do not commit credentials, tokens, personal data, or production data.
- A configured credential is not evidence of a healthy external connection.
- This foundation is not represented as production-ready.

## License

[MIT](./LICENSE)
