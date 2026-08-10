/**
 * Lightweight gettext-style i18n, in the spirit of WordPress language packs /
 * Obsidian translations: one flat key→string JSON dictionary per locale under
 * `i18n/<locale>.json`, a single `t()` accessor, English as the fallback
 * locale. No runtime dependency; isomorphic (server + client components).
 *
 * Locale selection:
 * - `NEXT_PUBLIC_CASIOPLUS_LOCALE` — inlined into the client bundle at build
 *   time; set it for a deterministic locale on both server and client.
 * - `CASIOPLUS_LOCALE` — server-side override (middleware/route handlers).
 * - Default: `fa` (the operator console is Persian-first).
 */
import enJson from '@/i18n/en.json';
import faJson from '@/i18n/fa.json';

export type Locale = 'en' | 'fa';

export const LOCALE_ENV = 'CASIOPLUS_LOCALE';
export const LOCALE_PUBLIC_ENV = 'NEXT_PUBLIC_CASIOPLUS_LOCALE';

export const DEFAULT_LOCALE: Locale = 'fa';

const dictionaries: Record<Locale, Record<string, string>> = {
  en: enJson as unknown as Record<string, string>,
  fa: faJson as unknown as Record<string, string>,
};

export function getLocale(): Locale {
  const raw = (process.env[LOCALE_PUBLIC_ENV] ?? process.env[LOCALE_ENV] ?? '').toLowerCase();
  return raw === 'en' || raw === 'fa' ? raw : DEFAULT_LOCALE;
}

export function isRtl(locale: Locale = getLocale()): boolean {
  return locale === 'fa';
}

/**
 * Locale-aware number formatting — Persian digits for fa, plain for en.
 * Used for figures rendered next to translated text (counts, ratios, scores).
 */
export function num(value: number | string, locale: Locale = getLocale()): string {
  const s = String(value);
  if (locale !== 'fa') return s;
  return s.replace(/\d+(\.\d+)?/g, (m) =>
    new Intl.NumberFormat('fa-IR', { useGrouping: false, maximumFractionDigits: 2 }).format(Number(m)),
  );
}

/**
 * Translate `key` for `locale`, interpolating `{name}` placeholders from
 * `vars`. Missing keys fall back to English, then to the key itself — so a
 * missing translation is loud (visible) rather than silently blank.
 */
export function t(
  key: string,
  vars?: Record<string, string | number>,
  locale: Locale = getLocale(),
): string {
  const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Date/time & number formatting that follows the active locale. For `fa` this
 * means the Persian (Jalali) calendar and Persian digits via `fa-IR` — e.g.
 * "۱۸ مرداد ۱۴۰۵" instead of "Aug 9, 2026".
 */
export function localeTag(locale: Locale = getLocale()): string {
  return locale === 'fa' ? 'fa-IR' : 'en-US';
}

export function fmtDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
  locale: Locale = getLocale(),
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(localeTag(locale), opts).format(d);
}

export function fmtClock(iso: string, locale: Locale = getLocale()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(localeTag(locale), { hour: '2-digit', minute: '2-digit' }).format(d);
}

export function fmtNumber(n: number | null | undefined, locale: Locale = getLocale()): string {
  if (n == null) return '—';
  return new Intl.NumberFormat(localeTag(locale)).format(n);
}

/** "2026-Q2" → "2026 · Q2" (en) / "۲۰۲۶ · سه‌ماههٔ دوم" (fa). */
export function quarterLabel(quarter: string, locale: Locale = getLocale()): string {
  const [year, q] = quarter.split('-');
  const qKey = `roadmap.${(q ?? '').toLowerCase()}`;
  const qLabel = dictionaries[locale][qKey] ?? dictionaries.en[qKey] ?? q;
  return `${num(year, locale)} · ${qLabel}`;
}
