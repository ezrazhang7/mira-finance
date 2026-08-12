import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { todayISO } from '@/domain/dates';
import { I18nProvider } from '@/i18n/I18nProvider';
import { AppStoreProvider, useAppStore } from '@/store/AppStore';
import { Repository } from '@/storage/repository';
import { BudgetsPage } from './BudgetsPage';

function Seed({ children }: { children: ReactNode }) {
  const store = useAppStore();
  // Seed one grocery expense this month so meters have real data.
  if (store.status === 'ready' && store.transactions.length === 0) {
    void store.addTransaction({
      kind: 'expense',
      amount: 12000,
      categoryId: 'groceries',
      note: '',
      date: todayISO(),
    });
  }
  return children;
}

function renderPage() {
  const factory = new IDBFactory();
  return render(
    <AppStoreProvider openRepository={() => Repository.open(factory)}>
      <I18nProvider locale="en" currency="USD">
        <Seed>
          <BudgetsPage />
        </Seed>
      </I18nProvider>
    </AppStoreProvider>,
  );
}

describe('BudgetsPage', () => {
  it('creates a budget and shows spend progress', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText(/No budgets yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /set budget/i }));
    await screen.findByRole('dialog', { name: 'Set budget' });
    await user.selectOptions(screen.getByLabelText('Category'), 'groceries');
    await user.type(screen.getByLabelText('Monthly limit'), '300');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const meter = await screen.findByRole('progressbar');
    expect(meter).toHaveAttribute('aria-valuemax', '30000');
    expect(meter).toHaveAttribute('aria-valuenow', '12000');
    expect(screen.getByText('$180.00 left')).toBeInTheDocument();
  });

  it('marks over-budget categories', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/No budgets yet/);

    await user.click(screen.getByRole('button', { name: /set budget/i }));
    await screen.findByRole('dialog', { name: 'Set budget' });
    await user.selectOptions(screen.getByLabelText('Category'), 'groceries');
    await user.type(screen.getByLabelText('Monthly limit'), '100');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('$20.00 over budget')).toBeInTheDocument();
  });

  it('removes a budget from the edit dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/No budgets yet/);

    await user.click(screen.getByRole('button', { name: /set budget/i }));
    await screen.findByRole('dialog', { name: 'Set budget' });
    await user.type(screen.getByLabelText('Monthly limit'), '50');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /edit budget/i }));
    await screen.findByRole('dialog', { name: 'Edit budget' });
    await user.click(screen.getByRole('button', { name: 'Remove budget' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/No budgets yet/)).toBeInTheDocument();
  });
});
