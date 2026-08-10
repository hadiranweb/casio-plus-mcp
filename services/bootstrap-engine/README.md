# Bootstrap Engine — موتور بوت‌استرپ

این سرویس workspace خالی اما هدایت‌شده می‌سازد:

- `workspace-manifest.schema.yaml` → شناسنامه workspace
- `installer-protocol.yaml` → پروتکل System Igniter
- `starter-pack.yaml` → قالب‌های اولیه

پیاده‌سازی: `src/workspace.ts` + `src/templates.ts`

الگوریتم:

```python
kernel = PlatformKernel(version="0.1.0")
workspace = BootstrapEngine.create(kernel, org_id="acme", installer_id="system_igniter")
```

خروجی: `workspaces/{id}/manifest.yaml` + `knowledge.yaml` vessel + `data/workspaces/{id}/`
