import { renderHook, waitFor, act } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import type { DraftTransaction } from '@/domain/validation';
import { Repository } from '@/storage/repository';
import { AppStoreProvider, useAppStore } from './AppStore';

const draft: DraftTransaction = {
  kind: 'expense',
  amount: 1250,
  categoryId: 'groceries',
  note: 'weekly shop',
  date: '2026-08-10',
};

function setup() {
  const factory = new IDBFactory();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProvider openRepository={() => Repository.open(factory)}>{children}</AppStoreProvider>
  );
  return renderHook(() => useAppStore(), { wrapper });
}

async function ready(result: { current: ReturnType<typeof useAppStore> }) {
  await waitFor(() => expect(result.current.status).toBe('ready'));
}

describe('AppStore', () => {
  it('hydrates to an empty ready state', async () => {
    const { result } = setup();
    await ready(result);
    expect(result.current.transactions).toEqual([]);
    expect(result.current.budgets).toEqual([]);
    expect(result.current.settings.locale).toBe('en');
  });

  it('adds transactions sorted newest-first and rejects invalid drafts', async () => {
    const { result } = setup();
    await ready(result);

    await act(async () => {
      expect(await result.current.addTransaction({ ...draft, date: '2026-08-01' })).toEqual({
        ok: true,
      });
      expect(await result.current.addTransaction({ ...draft, date: '2026-08-09' })).toEqual({
        ok: true,
      });
    });
    expect(result.current.transactions.map((t) => t.date)).toEqual(['2026-08-09', '2026-08-01']);

    await act(async () => {
      const rejected = await result.current.addTransaction({ ...draft, amount: -5 });
      expect(rejected.ok).toBe(false);
    });
    expect(result.current.transactions).toHaveLength(2);
  });

  it('updates a transaction in place', async () => {
    const { result } = setup();
    await ready(result);
    await act(async () => {
      await result.current.addTransaction(draft);
    });
    const id = result.current.transactions[0]!.id;

    await act(async () => {
      expect(await result.current.updateTransaction(id, { ...draft, amount: 9999 })).toEqual({
        ok: true,
      });
    });
    expect(result.current.transactions[0]!.amount).toBe(9999);
  });

  it('supports undoable delete', async () => {
    const { result } = setup();
    await ready(result);
    await act(async () => {
      await result.current.addTransaction(draft);
    });
    const id = result.current.transactions[0]!.id;

    await act(async () => {
      expect(await result.current.deleteTransaction(id)).toEqual({ ok: true });
    });
    expect(result.current.transactions).toEqual([]);
    expect(result.current.pendingUndo?.id).toBe(id);

    await act(async () => {
      expect(await result.current.undoDelete()).toEqual({ ok: true });
    });
    expect(result.current.transactions.map((t) => t.id)).toEqual([id]);
    expect(result.current.pendingUndo).toBeNull();
  });

  it('upserts one budget per category', async () => {
    const { result } = setup();
    await ready(result);

    await act(async () => {
      expect(
        await result.current.saveBudget({ categoryId: 'groceries', monthlyLimit: 30000 }),
      ).toEqual({ ok: true });
      expect(
        await result.current.saveBudget({ categoryId: 'groceries', monthlyLimit: 45000 }),
      ).toEqual({ ok: true });
    });
    expect(result.current.budgets).toHaveLength(1);
    expect(result.current.budgets[0]!.monthlyLimit).toBe(45000);

    await act(async () => {
      expect(await result.current.deleteBudget(result.current.budgets[0]!.id)).toEqual({
        ok: true,
      });
    });
    expect(result.current.budgets).toEqual([]);
  });

  it('persists settings updates', async () => {
    const { result } = setup();
    await ready(result);
    await act(async () => {
      expect(
        await result.current.updateSettings({
          locale: 'es',
          currency: 'MXN',
          speakResponses: false,
        }),
      ).toEqual({ ok: true });
    });
    expect(result.current.settings.locale).toBe('es');
  });

  it('erases everything on request', async () => {
    const { result } = setup();
    await ready(result);
    await act(async () => {
      await result.current.addTransaction(draft);
      await result.current.saveBudget({ categoryId: 'dining', monthlyLimit: 10000 });
      expect(await result.current.eraseAllData()).toEqual({ ok: true });
    });
    expect(result.current.transactions).toEqual([]);
    expect(result.current.budgets).toEqual([]);
  });
});
