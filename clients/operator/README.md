# CasioPlus Operator UI — Cloned for spec layout

این پوشه mirror از `../../operator/` است طبق `spec` باید در `clients/operator` باشد.

پیاده‌سازی واقعی: `operator/app`, `operator/lib`, `operator/components`, `operator/i18n`

MCP اتصال: `operator/lib` از `src/server.ts` via HTTP bridge `localhost:4110` استفاده می‌کند.

برای اجرای فعلی:

```bash
cd operator && npm install && npm run dev
# یا از اینجا:
# npm --prefix ../../operator run dev
```
