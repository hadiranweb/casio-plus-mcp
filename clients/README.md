# Clients — کلاینت‌ها (خود سیستم نیستند)

طبق spec سه‌لایه، این پوشه همه رابط‌های انسانی/برنامه‌نویسی را نگه می‌دارد.
سیستم اصلی در `core/` و `services/` است — کلاینت‌ها فقط مصرف‌کننده‌اند.

| پوشه | چیست | کجا پیاده شده |
|---|---|---|
| `operator/` | CasioPlus Operator UI (Next.js) | `../../operator/` (ریشه) — اینجا mirror است |
| `studio/` | Studio PWA (Vite) | `../../studio/` (ریشه) |
| `installer/` | ابزار نصب workspace (System Igniter CLI) | `installer/` |
| `cli/` | CLI عمومی اکوسیستم | `cli/` |

> نکته: در این ریپو `operator/` و `studio/` هنوز در ریشه‌اند برای سازگاری با CI/Deploy فعلی.
> این پوشه‌ها mirror و نقشه راه هستند — مهاجرت کامل با `git mv` در فاز نهایی انجام می‌شود.
