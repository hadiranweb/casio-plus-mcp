# Quality Gate Service

سرویس جداگانه گیت کیفیت — همان `src/quality.ts` + `src/intake-store.ts` + fuzz dedup.

طبق `core/policies/data-quality.yaml`:

- completeness, duplicates (exact + fuzzy >=0.92), validity, consistency, provenance, authorization
- fingerprint sha256
- quarantine / validated / rejected
