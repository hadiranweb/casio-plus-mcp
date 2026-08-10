# MCP Server — Platform Kernel Service

این پوشه پیاده‌سازی Platform Kernel است — Synaptic Hub اکوسیستم.

- `src/kernel.ts` → بارگذاری Kernel از `core/` و `platform-kernel.yaml`
- `src/router.ts` → هدایت workspace_id → workspace context (Island Router)
- `src/quality-gate.ts` → Data Quality Gate (policy/data-quality.yaml)
- `src/approval-gate.ts` → Approval Gate (policy/approval.yaml)
- `src/audit-log.ts` → Audit Log (policy/audit)
- `src/evidence-store.ts` → Evidence Primitive Store

در این ریپو، پیاده‌سازی واقعی در `../../src/` قرار دارد و این پوشه
re-exportها را نگه می‌دارد تا ساختار `services/mcp-server` مطابق spec باشد.

```ts
// services/mcp-server/src/kernel.ts
export * from "../../../src/platform-kernel.js";
```

همه ۵ سطح ابزار MCP (Level 0-4) در `src/server.ts` پیاده شده‌اند.
