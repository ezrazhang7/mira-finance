import { AppStoreProvider, useAppStore } from '@/store/AppStore';
import { I18nProvider, useI18n } from '@/i18n/I18nProvider';
import { AppShell } from '@/app/AppShell';
import { useHashRoute } from '@/app/router';
import { DashboardPage } from '@/app/pages/DashboardPage';
import { TransactionsPage } from '@/app/pages/TransactionsPage';
import { VoiceAssistant } from '@/app/voice/VoiceAssistant';

function RoutedApp() {
  const [page, navigate] = useHashRoute();
  const { t } = useI18n();

  return (
    <AppShell page={page} onNavigate={navigate}>
      {page === 'dashboard' && <DashboardPage onNavigate={navigate} />}
      {page === 'transactions' && <TransactionsPage />}
      {page === 'budgets' && <h1 className="page-title">{t('budgets.title')}</h1>}
      {page === 'insights' && <h1 className="page-title">{t('insights.title')}</h1>}
      {page === 'settings' && <h1 className="page-title">{t('settings.title')}</h1>}
      <VoiceAssistant onNavigate={navigate} />
    </AppShell>
  );
}

function StatusGate() {
  const store = useAppStore();
  const { t } = useI18n();

  if (store.status === 'loading') {
    return (
      <div className="app-status" role="status">
        <p>{t('app.loading')}</p>
      </div>
    );
  }
  if (store.status === 'error') {
    return (
      <div className="app-status" role="alert">
        <p>{t('app.loadError', { message: store.errorMessage ?? '' })}</p>
      </div>
    );
  }
  return <RoutedApp />;
}

function LocalizedApp() {
  const store = useAppStore();
  return (
    <I18nProvider locale={store.settings.locale} currency={store.settings.currency}>
      <StatusGate />
    </I18nProvider>
  );
}

export function App() {
  return (
    <AppStoreProvider>
      <LocalizedApp />
    </AppStoreProvider>
  );
}
