import { render, screen } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { todayISO } from '@/domain/dates';
import { I18nProvider } from '@/i18n/I18nProvider';
import { AppStoreProvider, useAppStore } from '@/store/AppStore';
import { Repository } from '@/storage/repository';
import { niceCeiling } from '@/app/components/charts/scale';
import { InsightsPage } from './InsightsPage';

describe('niceCeiling', () => {
  it('rounds up to 1/2/5 steps', () => {
    expect(niceCeiling(0)).toBe(100);
    expect(niceCeiling(90)).toBe(100);
    expect(niceCeiling(101)).toBe(200);
    expect(niceCeiling(350)).toBe(500);
    expect(niceCeiling(700)).toBe(1000);
    expect(niceCeiling(12345)).toBe(20000);
  });
});

function Seed({ children }: { children: ReactNode }) {
  const store = useAppStore();
  if (store.status === 'ready' && store.transactions.length === 0) {
    void store.addTransaction({
      kind: 'expense',
      amount: 2500,
      categoryId: 'groceries',
      note: '',
      date: todayISO(),
    });
    void store.addTransaction({
      kind: 'expense',
      amount: 1000,
      categoryId: 'dining',
      note: '',
      date: todayISO(),
    });
  }
  return children;
}

function renderPage(seed: boolean) {
  const factory = new IDBFactory();
  return render(
    <AppStoreProvider openRepository={() => Repository.open(factory)}>
      <I18nProvider locale="en" currency="USD">
        {seed ? (
          <Seed>
            <InsightsPage />
          </Seed>
        ) : (
          <InsightsPage />
        )}
      </I18nProvider>
    </AppStoreProvider>,
  );
}

describe('InsightsPage', () => {
  it('shows an inviting empty state without data', async () => {
    renderPage(false);
    expect(await screen.findByText(/charts will appear here/)).toBeInTheDocument();
  });

  it('renders the trend chart, table fallback, and category breakdown', async () => {
    renderPage(true);

    expect(await screen.findByRole('img', { name: 'Spending by month' })).toBeInTheDocument();
    expect(screen.getByText('Chart data as table')).toBeInTheDocument();
    // Table fallback carries the real total for the current month.
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(screen.getByRole('table')).toHaveTextContent('$35.00');

    // Breakdown ranks groceries above dining with direct value labels.
    // ($25.00 may also appear as an axis tick, so match non-uniquely.)
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getAllByText('$25.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$10.00').length).toBeGreaterThanOrEqual(1);
  });
});
