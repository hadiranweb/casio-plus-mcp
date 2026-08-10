# Core — Platform Kernel (لایه ۱ و ۲)

این پوشه **منبع حقیقت معماری** است — مستقل از برند، صنعت، محصول.

```
core/
├── constitution/   ← قانون اساسی (تغییرناپذیر)
│   ├── principles.yaml
│   ├── governance.yaml
│   └── firewall.yaml
├── primitives/     ← انواع پایه
│   ├── playbook.schema.yaml
│   ├── template.schema.yaml
│   ├── decision.schema.yaml
│   ├── registry.schema.yaml
│   ├── evidence.schema.yaml   ← مهم‌ترین primitive
│   ├── feedback.schema.yaml
│   └── automation-spec.schema.yaml
├── policies/       ← سیاست‌ها
│   ├── data-quality.yaml
│   ├── versioning.yaml
│   ├── approval.yaml
│   ├── rbac.yaml
│   └── no-fake-knowledge.yaml
├── bootstrap/      ← موتور استقرار
│   ├── workspace-manifest.schema.yaml
│   ├── installer-protocol.yaml
│   └── starter-pack.yaml
└── mcp/            ← قراردادهای MCP
    ├── tools.yaml        (۵ سطح)
    ├── resources.yaml
    └── prompts.yaml
```

** اصل: هیچ فایلی در `core/` نام برند یا دانش سازمانی ندارد — تست `platform-kernel.test.ts` این را تضمین می‌کند.

`platform-kernel.yaml` در ریشه، خلاصهٔ همین پوشه برای بارگذاری سریع است.
`general_ecosystem.yaml` در ریشه، نگاشت سه‌لایه (Kernel → Workspace → Memory) است.
