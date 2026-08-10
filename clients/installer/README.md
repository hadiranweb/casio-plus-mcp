# Installer — ابزار نصب workspace (System Igniter)

این ابزار `create_workspace` + `define_domain` + `assign_owner` را از طریق MCP اجرا می‌کند.

استفاده (مفهومی):

```bash
npx tsx clients/installer/install.ts --id acme --displayName "Acme Co" --domains sales,education --owner sales_lead
```

پیاده‌سازی واقعی الان: `src/server.ts` tool `create_workspace` via MCP.

در آینده این CLI مستقل با `commander` ساخته می‌شود و به `services/bootstrap-engine` وصل می‌شود.
