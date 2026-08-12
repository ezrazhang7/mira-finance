import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { CATEGORIES } from '@/domain/categories';
import { I18nProvider, useI18n } from './I18nProvider';
import type { Locale } from './I18nProvider';
import { en, es } from './translations';
import type { TranslationKey } from './translations';

function hook(locale: Locale, currency = 'USD') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider locale={locale} currency={currency}>
      {children}
    </I18nProvider>
  );
  return renderHook(() => useI18n(), { wrapper }).result;
}

describe('translation catalogs', () => {
  it('Spanish covers every English key with a non-empty string', () => {
    for (const key of Object.keys(en) as TranslationKey[]) {
      expect(es[key], `missing es translation for ${key}`).toBeTruthy();
    }
  });

  it('has a name for every category in both locales', () => {
    for (const category of CATEGORIES) {
      expect(en[`category.${category.id}` as TranslationKey]).toBeTruthy();
      expect(es[`category.${category.id}` as TranslationKey]).toBeTruthy();
    }
  });

  it('keeps interpolation slots consistent across locales', () => {
    for (const key of Object.keys(en) as TranslationKey[]) {
      const slots = (template: string) =>
        [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      expect(slots(es[key]), `slot mismatch in ${key}`).toEqual(slots(en[key]));
    }
  });
});

describe('useI18n', () => {
  it('translates with interpolation', () => {
    const result = hook('en');
    expect(result.current.t('budgets.remaining', { amount: '$5.00' })).toBe('$5.00 left');
  });

  it('switches catalogs by locale', () => {
    expect(hook('en').current.t('nav.budgets')).toBe('Budgets');
    expect(hook('es').current.t('nav.budgets')).toBe('Presupuestos');
  });

  it('resolves category names', () => {
    expect(hook('es').current.categoryName('groceries')).toBe('Despensa');
  });

  it('formats money in the configured currency', () => {
    expect(hook('en').current.money(123456)).toBe('$1,234.56');
  });

  it('formats dates and months per locale', () => {
    const enI18n = hook('en');
    expect(enI18n.current.date('2026-08-12')).toMatch(/Aug/);
    expect(enI18n.current.month('2026-08')).toMatch(/August 2026/);

    const esI18n = hook('es');
    expect(esI18n.current.month('2026-08')).toMatch(/agosto/i);
  });
});
