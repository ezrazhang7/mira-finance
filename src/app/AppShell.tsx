import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import type { Page } from '@/voice/intents';
import { ChartIcon, GearIcon, HomeIcon, ListIcon, WalletIcon } from './icons';

const NAV_ITEMS: { page: Page; icon: typeof HomeIcon; labelKey: `nav.${Page}` }[] = [
  { page: 'dashboard', icon: HomeIcon, labelKey: 'nav.dashboard' },
  { page: 'transactions', icon: ListIcon, labelKey: 'nav.transactions' },
  { page: 'budgets', icon: WalletIcon, labelKey: 'nav.budgets' },
  { page: 'insights', icon: ChartIcon, labelKey: 'nav.insights' },
  { page: 'settings', icon: GearIcon, labelKey: 'nav.settings' },
];

export function AppShell({
  page,
  onNavigate,
  children,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        {t('app.skipToContent')}
      </a>
      <main className="shell__main" id="main">
        {children}
      </main>
      <nav className="bottom-nav" aria-label={t('app.name')}>
        {NAV_ITEMS.map(({ page: itemPage, icon: Icon, labelKey }) => (
          <button
            key={itemPage}
            type="button"
            className="bottom-nav__item"
            aria-current={page === itemPage ? 'page' : undefined}
            onClick={() => onNavigate(itemPage)}
          >
            <Icon className="bottom-nav__icon" />
            <span className="bottom-nav__label">{t(labelKey)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
