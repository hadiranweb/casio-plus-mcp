# CASIOPLUS Operator

**The knowledge-and-operations command center of the Casio Plus ecosystem.**

CASIOPLUS Operator turns the tabs, tools, and mental overhead of running the
business into one screen: unified comms, a client funnel, social growth,
finances, a knowledge graph, and a roster of named AI agents that each own a
real job. It is the interaction-and-operations layer of Casio Plus — the
Knowledge Core (`knowledge/casio.yaml` plus the playbooks) stays the source of
truth, and this app reads through a repository layer and reports honest
connector status.

See [`NOTICE.md`](NOTICE.md) for upstream provenance and license attribution.

---

## Quick start

Requires **Node 18+**.

```bash
npm install
cp .env.example .env.local   # optional; only needed to wire live integrations
npm run dev                  # http://localhost:4100
```

A local SQLite database is **seeded on first run**, so every page is populated
immediately. No credentials are required to browse. Navigate with the sidebar
or the Command Palette (Cmd/Ctrl + K).

```bash
npm run build && npm start   # production build
npm test                     # vitest suite
npm run typecheck            # tsc --noEmit
npm run seed                 # re-seed the DB (idempotent)
```

---

## What you're looking at

| Route | What it is |
| --- | --- |
| `/` | Operator console: pulse row, connections strip, agent list, knowledge core |
| `/comms` | Unified inbox: email, Slack, WhatsApp, and dictation lanes in one feed |
| `/funnel` | Campaign flow: the 4-stage Casio campaign model and its execution gates |
| `/social` | Growth dashboard: per-account follower charts, audience share, posting cadence |
| `/content` | Content pipeline and calendar |
| `/finances` | Income and expense charts, money-out views, expenses by category |
| `/agents` | The AI agent roster, each with a real `run()` and last-run state |
| `/tasks` | Task board fed by the agents |
| `/skills` | Reusable, schedulable agent skills |
| `/org` | Org hierarchy: operator, conductor, pillars, workers |
| `/brain` | The knowledge core and graph (see **Knowledge layer** below) |
| `/workflows` | Multi-step tool workflows |
| `/integrations` | Live connections board with honest status for every connector |
| `/analytics` | Real connector numbers and sparkline history |
| `/roadmap`, `/reference` | Phases and quarters, and the reference model |
| `/personas` | Persona templates that reskin the OS for other business types |

---

## Architecture: repository-first, honest-status

This is the load-bearing design rule. **Every page and API route reads through
a repository layer** (never a raw query), and **every connector returns an
honest status** (it never fakes "connected"). Swapping seeded tables for live
sources is a repo-level change, not a rewrite.

- **`lib/data.ts`**: `getDb()` app singleton; seeds on first touch.
- **`lib/db.ts`**: `openDb()` plus typed repositories (`agents`, `departments`,
  `social`, `funnel`, `finances`, and more).
- **`lib/seed.ts` / `lib/casio-seed.ts`**: seeded content, including the Casio
  department/agent roster layered on top.
- **`lib/schemas.ts`**: Zod schemas validate every row on the way **out** of
  the DB, so bad data fails loud.
- **`lib/connectors/*`**: 20+ connector groups (email/IMAP, Slack, Stripe,
  Notion, calendar, CRM, social, and more). Each returns a typed
  `ConnectorStatus` of `connected`, `not_configured`, or `error`: always the
  truth, never a fake green light.
- **`lib/agents/*`**: every seeded agent maps one-to-one to a runtime agent
  with a real `run()`; runs persist and surface on `/agents`.

New data means a new repo method, a Zod schema, a seed entry, and a test. Keep
it that way.

---

## Knowledge layer: G-Brain

The `/brain` graph is the visible surface of G-Brain, the knowledge system of
the Casio Plus ecosystem.

Plain **Markdown files are the source of truth**. They're chunked and embedded
into a vector store, so one store answers both **keyword** and **semantic**
queries (hybrid retrieval with reciprocal-rank fusion). If the vector backend
is unreachable, retrieval falls back to a local grep over the markdown: fewer
smarts, zero downtime.

Every agent queries that same store before it acts, so the system carries one
shared memory instead of one per agent.

---

## Project structure

```
app/                 Next.js App Router; one folder per view plus /api routes
components/          UI: dashboard sections, graphs, terminal primitives
lib/
  data.ts db.ts      repository layer plus app DB singleton
  seed.ts            seeded content
  casio-seed.ts      Casio roster layered on top of the base seed
  schemas.ts         Zod schemas (validate every DB/API boundary)
  connectors/        20+ honest-status integrations
  agents/            agent registry plus runtimes
  knowledge-graph.ts, memory-core.ts   brain graph plus memory model
scripts/             seed, casio setup, and doc-generation scripts
tests/               vitest suite (one file per module)
```

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to
`.env.local` and fill in only what you want to wire up; everything else stays
in honest "not configured" mode. `.env.local` is gitignored.

**Never commit real keys.** The app runs fully without any of them.

Key environment variables:

| Variable | Purpose |
| --- | --- |
| `CASIOPLUS_ACCESS_TOKEN` | Shared access token; **required** for production serving |
| `CASIOPLUS_DB` | SQLite path override (default `data/casioplus.db`) |
| `CASIOPLUS_ENV_LOCAL` | `.env.local` path override (used by tests) |
| `CASIOPLUS_SKILLS_DIR` | Agent skills directory override |

---

## Tech stack

- **Next.js 14** (App Router, server components) plus **TypeScript**
- **Tailwind CSS**: monochrome "Monolith" theme with pickable colorways
- **better-sqlite3**: local store (WAL)
- **Zod**: schema validation at every boundary
- **Vitest**: test suite
- **Vercel AI SDK**: agent LLM calls
- **d3-force**, **lucide-react**, **simple-icons**: graph physics and iconography

---

## Testing

```bash
npm test          # run the full vitest suite
npm run typecheck # tsc --noEmit
```

Tests live in `tests/`, one file per module, using an in-memory SQLite pattern
so they never touch the seeded dev DB.

---

## Access control

CASIOPLUS is a **single-operator** system. There are no user accounts and the
data model has no tenancy, so access control is one shared token in front of
everything rather than per-user auth.

- **Locally, nothing changes.** With `CASIOPLUS_ACCESS_TOKEN` unset, a dev
  server behaves exactly as before, and `npm run dev` binds to `127.0.0.1` so
  it is not reachable from the rest of the network.
- **Deployed, a token is required.** A production server with no token set
  refuses to serve and explains why. This app can read your inboxes, send mail
  as you, and store a Stripe key, so a missing secret fails loudly rather than
  serving all of that to anyone with the URL.

Set it, then open the app and enter the same value once:

```bash
openssl rand -hex 32     # put the result in CASIOPLUS_ACCESS_TOKEN
```

Scripts and agents can present it as a header instead:

```bash
curl -H "Authorization: Bearer $CASIOPLUS_ACCESS_TOKEN" https://your-app/api/connections
```

Inbound webhooks (`/api/webhooks/…`) stay reachable without it, since third
parties cannot present your token. They carry their own secrets, so set
`MANYCHAT_WEBHOOK_SECRET` if you use the ManyChat ingest.

**Temporary testing bypass.** To acceptance-test a production build on a
trusted preview host without the gate, start it with
`CASIOPLUS_AUTH_DISABLED=1`. This lifts the entire middleware gate; never use
it on a deployment that can reach live credentials.

---

## Deploying with Docker

The **production-ready, multi-stage Dockerfile** runs as a non-root user,
ships production dependencies only (no devDependencies), and never bakes
secrets into image layers.

### Build

```bash
docker build -t casioplus-operator .
```

### Run

```bash
docker run --env-file .env -p 4100:4100 -v casioplus-data:/app/data casioplus-operator
```

| Flag | Why |
| --- | --- |
| `--env-file .env` | Injects all credentials at runtime (never baked into the image) |
| `-p 4100:4100` | Expose the app on port 4100 |
| `-v casioplus-data:/app/data` | Persist the SQLite database across container restarts |

The database seeds itself on first touch, so the first request populates a
fresh volume automatically.

> **Important:** Never bake `.env` into the image. The `.dockerignore`
> excludes it from the build context; credentials should always be passed at
> runtime via `--env-file` or your orchestrator's secret management.

### Health check

The image includes a built-in `HEALTHCHECK` that probes `http://localhost:4100/`
every 30 seconds. Orchestrators (Docker Swarm, ECS, Kubernetes) will
automatically use it for readiness checks.

---

## Note on the seeded data

Seeded names, companies, clients, financial figures, and social numbers are
**placeholder data** unless a connector reports itself `connected`.

## License

MIT. See [`LICENSE`](LICENSE) and [`NOTICE.md`](NOTICE.md).
