import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { formatCents } from '@/domain/money';
import type { Cents } from '@/domain/money';
import type { CategoryId } from '@/domain/types';
import { CATALOGS } from './translations';
import type { TranslationKey } from './translations';

export type Locale = keyof typeof CATALOGS;

export type TranslateParams = Record<string, string | number>;

export interface I18n {
  locale: Locale;
  currency: string;
  t: (key: TranslationKey, params?: TranslateParams) => string;
  categoryName: (id: CategoryId) => string;
  money: (amount: Cents) => string;
  /** Formats an ISO `yyyy-mm-dd` local date, e.g. "Aug 12". */
  date: (isoDate: string) => string;
  /** Formats a `yyyy-mm` month key, e.g. "August 2026". */
  month: (monthKey: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-US',
};

export function I18nProvider({
  locale,
  currency,
  children,
}: {
  locale: Locale;
  currency: string;
  children: ReactNode;
}) {
  const value = useMemo<I18n>(() => {
    const catalog = CATALOGS[locale];
    const intlLocale = INTL_LOCALE[locale];
    const dateFormat = new Intl.DateTimeFormat(intlLocale, { month: 'short', day: 'numeric' });
    const monthFormat = new Intl.DateTimeFormat(intlLocale, { month: 'long', year: 'numeric' });

    const t = (key: TranslationKey, params?: TranslateParams) => interpolate(catalog[key], params);

    return {
      locale,
      currency,
      t,
      categoryName: (id) => t(`category.${id}` as TranslationKey),
      money: (amount) => formatCents(amount, intlLocale, currency),
      date: (isoDate) => {
        const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
        return dateFormat.format(new Date(y, m - 1, d));
      },
      month: (monthKey) => {
        const [y, m] = monthKey.split('-').map(Number) as [number, number];
        return monthFormat.format(new Date(y, m - 1, 1));
      },
    };
  }, [locale, currency]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook + provider form one module API
export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return i18n;
}
