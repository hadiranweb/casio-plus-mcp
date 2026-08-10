# Runbook: Onboard New Workspace

> برای workspace دوم واقعی (نه sandbox)

## پیش‌نیاز
- kernel 0.1.0 فعال، DoD فاز ۲ سبز
- تصمیم G4: workspace دوم باید واقعی باشد (پایلوت یا برند)

## گام‌ها

1. **Bootstrap** (فاز ۱):
   ```bash
   npx tsx clients/cli/src/bootstrap.ts --org newbrand --name "New Brand" --channel experimental --installer hadirweb:2026-08-11
   ```

2. **Verify**:
   ```bash
   npx tsx clients/cli/src/verify.ts --workspace newbrand
   ```

3. **Enable convergence opt-in** (G2):
   ```bash
   # در workspaces/newbrand/manifest.yaml:
   # convergence_opt_in: true
   ```

4. **Capture first evidence** (فاز ۲):
   ```bash
   npx tsx clients/cli/src/evidence.ts capture --workspace newbrand --domain sales --text "..."
   ```

5. **Check convergence** (فاز ۳):
   ```bash
   npx tsx services/convergence/src/report.ts
   ```

## حالت Dormant
اگر workspace دوم واقعی هنوز وجود ندارد، convergence در حالت `pending_second_real_workspace` می‌ماند — detector با دادهٔ مصنوعی تست شده اما فعال نمی‌شود.

## ارتقای کانال
- به beta: نیاز به چرخه شاهد فعال، ≥۱ پلی‌بوک با witness، audit
- به stable: ۳ ماه فعالیت + بدون خطای دروازه در ۳۰ روز
```bash
npx tsx clients/cli/src/state.ts --workspace newbrand
# سپس promote_workspace_channel via MCP (نیازمند approval)
```

## Rollback
- اگر onboarding شکست: حذف دایرکتوری `workspaces/newbrand` و `data/workspaces/newbrand` (idempotent, audit)
