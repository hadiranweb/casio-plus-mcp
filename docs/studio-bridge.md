# اتصال CasioPlus Studio به Core

```text
MCP Client ─────────────stdio────────────→ src/server.ts
                                               │
                                               │ shared domain core
                                               │
Studio (PWA) ── HTTP /api/* ──→ src/http.ts ──┘
```

## چرا HTTP Bridge؟

مرورگر مستقیماً با MCP stdio صحبت نمی‌کند. Bridge فقط یک adapter محلی برای UI است و منطق جدید یا منبع حقیقت مستقل ندارد.

هر دو مسیر از این ماژول‌ها استفاده می‌کنند:

- `knowledge-store.ts`
- `quality.ts`
- `intake-store.ts`
- `audit-store.ts`
- `proposal-store.ts`

## Endpointهای فعلی

```text
GET  /api/health
GET  /api/knowledge
GET  /api/summary
GET  /api/playbooks
GET  /api/playbooks/:id
GET  /api/architecture
GET  /api/learning
GET  /api/review-queue
GET  /api/version-proposals
GET  /api/audit-events
POST /api/feedback-intake
```

Bridge فقط روی `127.0.0.1:4110` گوش می‌دهد. برای محیط production، auth، RBAC، TLS، rate limit و audit policy پیش از expose شدن شبکه‌ای الزامی‌اند.
