# نصب امن CasioPlus

```bash
npm install
npm run setup:casio
```

## رفتار Wizard

- فقط در ترمینال تعاملی اجرا می‌شود.
- در CI/Docker/non-TTY بدون تغییر خارج می‌شود.
- هیچ token، password، secret یا credentialی نمی‌پرسد.
- هیچ درخواست شبکه‌ای انجام نمی‌دهد.
- هیچ remote، connector یا SSO را فعال نمی‌کند.
- فقط `.env.local` با mode `0600` و مقدارهای خالی می‌سازد.
- اگر `.env.local` موجود باشد، هرگز آن را overwrite نمی‌کند.

## SSO production

Wizard فقط Provider منتخب را ثبت می‌کند. برای فعال‌سازی واقعی باید `CASIO_SSO_SHARED_SECRET` صرفاً در Secret Manager محیط production قرار بگیرد؛ نه در فایل Git، نه در چت و نه در command history.
