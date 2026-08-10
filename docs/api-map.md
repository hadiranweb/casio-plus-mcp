# نقشهٔ API کاسیو‌پلاس — کجا API می‌گیریم، کجا API می‌دهیم

> این سند دو پرسش را پاسخ می‌دهد:
> ۱) این پلتفرم **چه APIهایی را مصرف می‌کند** (Outbound / API می‌گیرد)
> ۲) این پلتفرم **چه APIهایی را ارائه می‌دهد** (Inbound / API می‌دهد)
> و در انتها سناریوی استقرار `Dev → GitHub → GitHub Actions → SSH → Server` روی همین ریپو نگاشت شده است.

---

## نمای کلی

```text
                 ┌─────────────────────────── بیرون (Outbound) ───────────────────────────┐
                 │  Zernio/Late · Beehiiv · ManyChat · Attio · Wise · Slack · IMAP/SMTP   │
                 │  Stripe · Notion · AI Gateway · Supabase/pgvector · ZeroEntropy · …    │
                 └────────────────────────────────▲───────────────────────────────────────┘
                                                  │ فراخوانی با کلید (از سمت ما)
┌──────────┐   MCP (stdio)   ┌────────────────────────────────────┐   HTTP   ┌──────────────┐
│ کلاینت   │◄───────────────►│ CasioPlus MCP (src/server.ts)      │          │ مرورگر/عامل  │
│ AI/Agent │   MCP (HTTP)    │ پورت 4110 — فقط 127.0.0.1          │          │              │
└──────────┘◄───────────────►└────────────────────────────────────┘          └──────┬───────┘
                 ┌────────────────────────────────▼──────────────────────────────────┐
                 │ Operator (Next.js) — پورت 4100                                     │
                 │ ۴۲ مسیر /api/** + صفحه‌ها · گیت توکن CASIOPLUS_ACCESS_TOKEN        │
                 │ Webhook ورودی: /api/webhooks/manychat (بدون گیت، با secret خودش)  │
                 └─────────────────────────────────────────────────────────────────────┘
```

---

## ۱) APIهایی که سیستم **می‌دهد** (Inbound)

### ۱٫۱) Operator — REST داخلی (Next.js App Router، پورت 4100)

همهٔ مسیرها پشت گیت توکن هستند مگر آن‌هایی که استثنا شده‌اند (`lib/auth.ts`):
`/unlock`، `/api/unlock` و `/api/webhooks/**`.

| دامنه | مسیرها | کاربرد |
|---|---|---|
| Agents | `/api/agents`، `/api/agents/[id]/chat`، `/api/agents/[id]/run`، `/api/agents/activity`، `/api/agents/broadcast`، `/api/agents/work` | فهرست عامل‌ها، چت، اجرای دستی، فید فعالیت، پخش گروهی، وظایف/زمان‌بندی |
| Automation | `/api/automation-specs`، `/api/automation-specs/[id]/execute` | مشخصات اتوماسیون و اجرای کنترل‌شده |
| Brain | `/api/brain`، `/api/brain/dump`، `/api/brain/graph`، `/api/brain/overview` | ذخیره‌سازی یادداشت در مغز، گراف، وضعیت gbrain |
| Casio Metric | `/api/casio-metric`، `/api/casio/access` | ثبت رکورد سنجه (سبز/زرد/قرمز)، کنترل دسترسی |
| Coaching | `/api/coaching-sessions` | ثبت/دریافت جلسات کوچینگ |
| Comms | `/api/comms`، `/api/comms/reply`، `/api/contacts/tags` | فید یکپارچه، پاسخ به پیام، برچسب‌گذاری اولویت مخاطب |
| Conductor | `/api/conductor/context` | بافت صفحهٔ جاری برای عامل ارشد |
| Connections | `/api/connections`، `/api/connections/connect`، `/api/keys`، `/api/tools` | وضعیت زندهٔ اتصال‌ها، ذخیره/حذف کلید در `.env.local`، ابزارها |
| Departments / Org | `/api/departments`، `/api/life/map` | دپارتمان‌ها و نقشهٔ زندگی |
| Finances | `/api/finances/statements`، `/api/finances/bank-statement` | صورت‌حساب‌ها و آپلود CSV/PDF |
| Funnel | `/api/funnel`، `/api/funnel/lead-message` | قیف و پیام لید |
| Metrics / Roadmap | `/api/metrics`، `/api/roadmap` | سنجه‌ها و نقشهٔ راه |
| Skills | `/api/skills/[slug]` | خواندن SKILL.md از دیسک |
| Social | `/api/social`، `/api/social/[platform]`، `/api/social/history`، `/api/social/posts`، `/api/social/series`، `/api/social/sync`، `/api/social/dm/reply` | داشبورد مخاطب، همگام‌سازی زنده با Zernio، صف انتشار، پاسخ DM |
| Auth | `/api/unlock` | تبادل توکن با کوکی نشست (عمومی) |
| Ventures | `/api/ventures` | دادهٔ ونچرها |

### ۱٫۲) Webhook ورودی (بدون گیت توکن)

| مسیر | فرستنده | مکانیزم امنیت |
|---|---|---|
| `/api/webhooks/manychat` | ManyChat | امضای `MANYCHAT_WEBHOOK_SECRET` |

این تنها نقطه‌ای است که **سرویس‌های بیرونی به ما push می‌کنند**. برای استقرار، این مسیر باید از اینترنت قابل دسترس باشد.

### ۱٫۳) CasioPlus MCP (ریشهٔ ریپو — `src/`)

یک سرور MCP جدا که دانش کاسیو را به عامل‌ها می‌دهد:

- **Tools (۱۰):** `search_playbooks`, `get_playbook`, `get_architecture`, `get_learning_path`, `validate_record`, `submit_feedback_intake`, `list_review_queue`, `review_feedback`, `list_version_proposals`, `list_audit_events`
- **Resources:** `casio://knowledge/model`, `casio://playbooks`, `casio://architecture`, `casio://learning/program`, `casio://documents`, `casio://gaps`
- **انتقال:** stdio (`npm run start:stdio`) یا HTTP bridge (`npm run start:http`) روی پورت `CASIO_HTTP_PORT` پیش‌فرض **4110** — فقط روی `127.0.0.1` (برای شبکه باید reverse proxy گذاشت).

---

## ۲) APIهایی که سیستم **می‌گیرد** (Outbound)

همه در `operator/lib/connectors/*` — هر کانکتور وضعیت صادقانه برمی‌گرداند (`connected / not_configured / error`).

| سرویس | Endpoint | کلید محیطی | دادهٔ گرفته‌شده |
|---|---|---|---|
| Zernio / Late | `zernio.com`, `getlate.dev` | فایل `~/.config/social/.env` | فالوورهای زنده، پست‌های منتشرشده، انتشار |
| Beehiiv | `api.beehiiv.com` | `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID` | مشترکان و خبرنامه‌ها |
| ManyChat | `api.manychat.com` | `MANYCHAT_API_KEY` | دایرکت‌های اینستاگرام، ارسال پاسخ |
| Attio (CRM) | `api.attio.com` | از پیکربندی MCP | معاملات و مخاطبان |
| Wise | `api.wise.com` | `WISE_*` | تراکنش‌های خروجی |
| Slack | `slack.com` | `SLACK_BOT_TOKEN` | پیام کانال‌ها، ارسال پاسخ |
| ایمیل (IMAP/SMTP) | سرورهای `INBOX_1..4_*` | `INBOX_n_HOST/USER/PASS` | خواندن ایمیل + ارسال پاسخ |
| Stripe | `api.stripe.com` | `STRIPE_SECRET_KEY` | موجودی و تراکنش‌ها |
| PayPal / Square / Whop | APIهای مربوطه | `PAYPAL_*`, `SQUARE_ACCESS_TOKEN`, `WHOP_API_KEY` | پرداخت‌ها (در انتظار کلید) |
| Notion | `api.notion.com` | `NOTION_API_KEY` | صفحات اخیر |
| WebinarJam | `api.webinarjam.com` | `WEBINARJAM_API_KEY` | ثبت‌نامی‌های وبینار |
| Trakyo / GoHighLevel | API | `TRAKYO_API_KEY`, `GHL_API_KEY`, `GHL_LOCATION_ID` | انتساب ارگانیک، پایپ‌لاین |
| FanBasis | `www.fanbasis.com` | `FANBASIS_VANTAGE_KEY`, `FANBASIS_LC_KEY` | بافت مشتری/پرداخت |
| Arcads | `external-api.arcads.ai` | روی ماشین | تبلیغات UGC |
| Miro | `api.miro.com` | (نقشه‌ها) | بورد/نقشه |
| Google | `google.com` | تقویم: app passwordهای `INBOX_*` از CalDAV | رویدادهای تقویم |
| AI Gateway | gateway | `AI_GATEWAY_API_KEY` | خلاصه‌سازی/چت عامل‌ها |
| Supabase + ZeroEntropy | از طریق `gbrain` CLI | `~/.config/knowledge` | جست‌وجوی ترکیبی مغز دوم |
| WhatsApp | **بدون API** — فایل محلی `ChatStorage.sqlite` | دسترسی Full Disk | چت‌های دسکتاپ (فقط‌خواندنی) |

> نکتهٔ امنیتی: این کلیدها هرگز commit نمی‌شوند؛ در استقرار به‌صورت env به کانتینر تزریق می‌شوند.

---

## ۳) نگاشت سناریوی استقرار شما روی این ریپو

```text
┌──────┐  push  ┌────────┐  trigger  ┌─────────────────────────┐
│ Dev  ├───────►│ GitHub ├──────────►│ GitHub Actions           │
└──────┘       └────────┘           │ 1) test (vitest + tsc)   │
                                    │ 2) build (next build)    │
                                    │ 3) push image (GHCR)     │
                                    │ 4) SSH deploy            │
                                    └────────────┬────────────┘
                                                 │ SSH
                                    ┌────────────▼────────────┐
                                    │ Server                   │
                                    │ docker pull + compose up │
                                    └─────────────────────────┘
```

### داشته‌های فعلی ریپو

| جزء | وضعیت |
|---|---|
| `operator/Dockerfile` چندمرحله‌ای (node:20-alpine + ابزار بیلد برای better-sqlite3 + `HEALTHCHECK` + `PORT=4100`) | ✅ موجود |
| اسکریپت‌های `npm test` / `typecheck` / `build` در ریشه و operator | ✅ موجود |
| `.github/workflows/*` | ❌ هنوز ندارد (پیشنهاد زیر) |
| Registry تصویر | پیشنهاد: **GHCR** (`ghcr.io/hadiranweb/casio-plus-mcp`) |

### الزامات هر مرحله

**۱) test** — `npm ci` در ریشه و `operator/`؛ سپس `tsc --noEmit` و `vitest run` (۹۵۴ تست).
**۲) build** — `next build` در `operator/` (فونت‌ها self-hosted هستند؛ بیلد به اینترنتِ گوگل نیاز ندارد).
**۳) push image** — `docker build -t ghcr.io/.../operator:$GITHUB_SHA operator/` و push با `permissions: packages: write`.
**۴) SSH deploy** — روی سرور:
```bash
echo "$REGISTRY_PASS" | docker login ghcr.io -u "$REGISTRY_USER" --password-stdin
docker compose pull && docker compose up -d
```

### تنظیماتی که سرور مقصد حتماً می‌خواهد

| مورد | چرا |
|---|---|
| `CASIOPLUS_ACCESS_TOKEN` | ایمیج پروداکشن **بدون توکن سرویس نمی‌دهد** (fail-closed). در Actions بسازید: `openssl rand -hex 32` و در secrets سرور تزریق شود — نه داخل ایمیج |
| Volume برای `/app/data` | دیتابیس SQLite (`casioplus.db`) باید ماندگار باشد |
| دسترسی outbound به HTTPS | اپ به جدول بخش ۲ فراخوانی می‌زند؛ فایروال فقط inbound را ببندد |
| مسیر عمومی برای `/api/webhooks/manychat` | تنها webhook ورودی؛ گیت توکن این مسیر را رد می‌کند ولی باید از بیرون برسد |
| کلیدهای کانکتورها | هر کدام را خواستید فعال شود به‌عنوان env (بخش ۲) — بقیه در حالت «پیکربندی نشده» می‌مانند |

### نمونهٔ workflow (پیشنهادی)

```yaml
# .github/workflows/deploy.yml
name: build-and-deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci && npm run check          # ریشه (MCP)
      - working-directory: operator
        run: npm ci && npm run typecheck && npm test

  image:
    needs: test
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: operator
          push: true
          tags: |
            ghcr.io/hadiranweb/casio-plus-operator:${{ github.sha }}
            ghcr.io/hadiranweb/casio-plus-operator:latest

  deploy:
    needs: image
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            cd /opt/casioplus
            docker compose pull
            docker compose up -d
            sleep 5 && curl -fsS http://localhost:4100/unlock >/dev/null
```

> ⚠️ در `docker-compose.yml` سرور: `image: ghcr.io/hadiranweb/casio-plus-operator:latest`،
> `ports: 4100:4100`، `volumes: casioplus-data:/app/data` و
> `environment: CASIOPLUS_ACCESS_TOKEN=…` (+ کلیدهای کانکتورهای دلخواه).

---

## خلاصهٔ یک‌خطی

- **API می‌دهیم:** ۴۲ مسیر REST داخلی روی Operator (پورت 4100، پشت گیت توکن) + ۱۰ ابزار MCP (پورت 4110 محلی) + ۱ webhook ورودی ManyChat.
- **API می‌گیریم:** ~۲۰ سرویس بیرونی با کلیدهای محیطی (جدول بخش ۲) — وضعیت هر کدام در صفحهٔ `/integrations` صادقانه نمایش داده می‌شود.
- **استقرار:** Dockerfile آماده است؛ فقط workflow و secrets (توکن اپ + SSH + registry) باقی است — نمونهٔ کامل بالا.
