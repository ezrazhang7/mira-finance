import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider, useI18n } from '@/i18n/I18nProvider';
import { AppStoreProvider, useAppStore } from '@/store/AppStore';
import { Repository } from '@/storage/repository';
import { SettingsPage } from './SettingsPage';

function Localized({ children }: { children: ReactNode }) {
  const store = useAppStore();
  // Mirror the app's StatusGate: pages render only after hydration.
  if (store.status !== 'ready') {
    return null;
  }
  return (
    <I18nProvider locale={store.settings.locale} currency={store.settings.currency}>
      {children}
    </I18nProvider>
  );
}

function Probe() {
  const { t } = useI18n();
  return <p>{t('app.tagline')}</p>;
}

function renderPage() {
  const factory = new IDBFactory();
  return render(
    <AppStoreProvider openRepository={() => Repository.open(factory)}>
      <Localized>
        <SettingsPage />
        <Probe />
      </Localized>
    </AppStoreProvider>,
  );
}

describe('SettingsPage', () => {
  it('switches the app language live', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByText(/Voice-first personal finance/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Language'), 'es');

    expect(await screen.findByText(/Finanzas personales por voz/)).toBeInTheDocument();
    expect(screen.getByLabelText('Idioma')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ajustes guardados');
  });

  it('toggles spoken responses', async () => {
    const user = userEvent.setup();
    renderPage();
    const toggle = await screen.findByLabelText('Read responses aloud');
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(await screen.findByRole('status')).toHaveTextContent('Settings saved');
  });
});

describe('SettingsPage privacy controls', () => {
  it('erases all data only after explicit confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Erase all data' }));
    const dialog = await screen.findByRole('dialog', { name: 'Erase everything?' });
    expect(dialog).toBeInTheDocument();

    // Backing out keeps data intact.
    await user.click(screen.getByRole('button', { name: 'Keep my data' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Erase all data' }));
    await screen.findByRole('dialog', { name: 'Erase everything?' });
    await user.click(screen.getByRole('button', { name: 'Yes, erase everything' }));

    expect(await screen.findByRole('status')).toHaveTextContent('All data erased');
  });
});
