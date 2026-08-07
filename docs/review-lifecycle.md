# چرخهٔ بررسی و پیشنهاد نسخه‌ای

```text
feedback raw
  → validate_record
  → validated | quarantined
  → submit_feedback_intake
  → pending_review
  → review_feedback
      ├─ rejected → audit event
      └─ approved → audit event + version proposal
                               → pending_human_merge
                               → ادغام انسانی در knowledge/casio.yaml
```

## قاعده‌ها

1. فقط بازخورد `validated` می‌تواند تأیید شود.
2. بازخورد `quarantined` فقط قابل رد یا اصلاح و ثبت مجدد است.
3. تأیید بازخورد، فایل `knowledge/casio.yaml` را تغییر نمی‌دهد.
4. هر تأیید، رد و ساخت Proposal یک Audit Event می‌سازد.
5. هر Proposal نسخهٔ پایهٔ مدل دانش (`baseKnowledgeVersion`) را نگه می‌دارد.
6. ادغام نهایی فقط یک اقدام انسانی و نسخه‌دار در Git است.

## فایل‌های runtime محلی

```text
data/feedback-intake.json
data/audit-events.json
data/version-proposals.json
```

این فایل‌ها در Git commit نمی‌شوند. در مرحلهٔ production به یک ذخیره‌ساز نسخه‌دار و قابل audit منتقل خواهند شد.
