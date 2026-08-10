import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import fa from '../i18n/fa.json';
import { DEFAULT_LOCALE, isRtl, t } from '@/lib/i18n';

const enKeys = Object.keys(en).sort();
const faKeys = Object.keys(fa).sort();

/**
 * The language packs are the contract: WordPress-style flat key/value
 * dictionaries, one per locale. These tests keep the packs honest — no key
 * can exist in one locale without the other, and placeholders must line up
 * so interpolation never leaves `{name}` debris on screen.
 */
describe('language packs', () => {
  it('en and fa carry exactly the same keys', () => {
    expect(faKeys).toEqual(enKeys);
  });

  it('no empty translations', () => {
    for (const [locale, dict] of [['en', en], ['fa', fa]] as const) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim(), `${locale}:${key} is blank`).not.toBe('');
      }
    }
  });

  it('placeholders match between locales', () => {
    const vars = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(',');
    for (const key of enKeys) {
      expect(vars(fa[key as keyof typeof fa]), `placeholder mismatch in ${key}`).toBe(
        vars(en[key as keyof typeof en]),
      );
    }
  });
});

describe('t()', () => {
  it('defaults to Persian (the operator console is fa-first)', () => {
    expect(DEFAULT_LOCALE).toBe('fa');
    expect(t('nav.roadmap')).toBe('نقشه راه');
  });

  it('interpolates {vars}', () => {
    expect(t('sidebar.footer.live', { count: '3/9' }, 'en')).toBe('3/9 systems live');
    expect(t('sidebar.footer.live', { count: '۳/۹' }, 'fa')).toBe('۳/۹ سامانه فعال');
  });

  it('falls back to English, then to the key itself', () => {
    expect(t('does.not.exist', undefined, 'fa')).toBe('does.not.exist');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(t('sidebar.footer.live', {}, 'en')).toBe('{count} systems live');
  });

  it('maps direction per locale', () => {
    expect(isRtl('fa')).toBe(true);
    expect(isRtl('en')).toBe(false);
  });
});
