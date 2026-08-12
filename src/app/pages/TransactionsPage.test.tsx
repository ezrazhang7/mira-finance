import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider } from '@/i18n/I18nProvider';
import { AppStoreProvider } from '@/store/AppStore';
import { Repository } from '@/storage/repository';
import { TransactionsPage } from './TransactionsPage';

function renderPage() {
  const factory = new IDBFactory();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProvider openRepository={() => Repository.open(factory)}>
      <I18nProvider locale="en" currency="USD">
        {children}
      </I18nProvider>
    </AppStoreProvider>
  );
  return render(<TransactionsPage />, { wrapper });
}

describe('TransactionsPage', () => {
  it('adds an entry through the dialog form', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('No entries match this filter.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add entry/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Add entry' });
    expect(dialog).toBeInTheDocument();

    await user.type(screen.getByLabelText('Amount'), '12.50');
    await user.selectOptions(screen.getByLabelText('Category'), 'groceries');
    await user.type(screen.getByLabelText('Note (optional)'), 'weekly shop');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('weekly shop')).toBeInTheDocument();
    expect(screen.getByText(/−\$12\.50/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Entry saved');
  });

  it('shows a validation error for an unparseable amount', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No entries match this filter.');

    await user.click(screen.getByRole('button', { name: /add entry/i }));
    await user.type(screen.getByLabelText('Amount'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid amount');
    expect(screen.getByRole('dialog', { name: 'Add entry' })).toBeInTheDocument();
  });

  it('deletes with undo', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No entries match this filter.');

    await user.click(screen.getByRole('button', { name: /add entry/i }));
    await user.type(screen.getByLabelText('Amount'), '5');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /groceries/i }));
    await screen.findByRole('dialog', { name: 'Edit entry' });
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('No entries match this filter.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('Groceries')).toBeInTheDocument();
  });

  it('filters by kind', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No entries match this filter.');

    await user.click(screen.getByRole('button', { name: /add entry/i }));
    await user.type(screen.getByLabelText('Amount'), '10');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // The filter group and the form kind toggle share labels; scope to the page.
    const incomeFilter = screen.getAllByRole('button', { name: 'Income' })[0]!;
    await user.click(incomeFilter);
    expect(screen.getByText('No entries match this filter.')).toBeInTheDocument();
  });
});
