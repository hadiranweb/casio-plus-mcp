# CLI — رابط خط فرمان اکوسیستم

ابزار CLI برای Operator و Agentها:

- `casio workspace list`
- `casio workspace create --id acme --name "Acme"`
- `casio evidence capture --workspace acme --domain sales --summary "..."`
- `casio evidence list --workspace acme`
- `casio feedback submit ...`
- `casio playbook search --workspace casio --domain "آموزش و کوچینگ"`

پیاده‌سازی: `cli/casio.ts` (stub — MCP stdio client در آینده)

فعلاً: `npx tsx src/server.ts` را به‌صورت stdio صدا می‌زند.
