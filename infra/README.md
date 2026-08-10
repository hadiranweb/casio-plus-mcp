# Infra — زیرساخت

طبق spec:

- `docker/` — Dockerfile و compose برای MCP Server + Operator + Studio
- `kubernetes/` — manifests برای استقرار چند-جزیره‌ای (multi-workspace)
- `terraform/` — provisioning برای storage و secrets

در این فاز، infra واقعی در `operator/Dockerfile` و `operator/.github/workflows/ci.yml` است.
این پوشه‌ها placeholder برای مهاجرت بعدی‌اند.
