# قراردادهای دادهٔ اولیه

## Playbook

```yaml
id: 17
نام_پلی_بوک: راهنمای طراحی و اجرای کمپین‌های فروش دوره‌های آموزشی
دامنه: فروش و بازاریابی
نوع_دارایی_هگام: سند/چارچوب
سطح_هگام: سطح ۳: معمار دانش
نقش_مالک_استاندارد_هگام: طراح متدولوژی
وضعیت_نرمال_هگام: در حال توسعه
برچسب_داریم_لازم: داریم
برچسب_توسعه: توسعه
مدل_داده:
  ورودی: [دوره آموزشی, نتیجه کمپین‌های قبل]
  خروجی: [ساختار کمپین]
وابستگی_ها: [برگه کمپین]
```

## Feedback Intake

```yaml
id: fbk_0001
source_system: casio-operator
source_type: coaching_session
submitted_at: 2026-08-07T12:00:00Z
submitted_by: user_id
related_asset_id: 56
raw_payload: {}
quality_status: raw
quality_report:
  completeness: pending
  duplicates: pending
  validity: pending
  consistency: pending
  provenance: pending
review_status: pending
```

## Data Quality Result

```yaml
valid: false
quality_status: quarantined
errors:
  - field: submitted_by
    rule: required
    message: ثبت‌کنندهٔ بازخورد مشخص نیست.
warnings:
  - field: related_asset_id
    rule: reference
    message: پلی‌بوک مرتبط یافت نشد.
```
