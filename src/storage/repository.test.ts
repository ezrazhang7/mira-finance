import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/domain/types';
import type { Budget, Transaction } from '@/domain/types';
import { STORE_TRANSACTIONS, openDatabase, transactionDone } from './db';
import { Repository } from './repository';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2)}`,
    kind: 'expense',
    amount: 1250,
    categoryId: 'groceries',
    note: 'weekly shop',
    date: '2026-08-10',
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-10T10:00:00.000Z',
    ...overrides,
  };
}

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: `b-${Math.random().toString(36).slice(2)}`,
    categoryId: 'groceries',
    monthlyLimit: 30000,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Repository', () => {
  let repo: Repository;

  beforeEach(async () => {
    // A fresh in-memory IndexedDB per test: no cross-test state.
    repo = await Repository.open(new IDBFactory());
  });

  it('round-trips transactions', async () => {
    const tx = makeTx();
    await repo.putTransaction(tx);
    expect(await repo.listTransactions()).toEqual([tx]);

    const updated = { ...tx, amount: 999, updatedAt: '2026-08-11T09:00:00.000Z' };
    await repo.putTransaction(updated);
    expect(await repo.listTransactions()).toEqual([updated]);

    await repo.deleteTransaction(tx.id);
    expect(await repo.listTransactions()).toEqual([]);
  });

  it('refuses to persist malformed records', async () => {
    await expect(repo.putTransaction(makeTx({ amount: -1 as unknown as number }))).rejects.toThrow(
      /malformed/,
    );
    await expect(
      repo.putBudget(makeBudget({ monthlyLimit: 0 as unknown as number })),
    ).rejects.toThrow(/malformed/);
  });

  it('round-trips budgets and enforces one budget per category', async () => {
    const budget = makeBudget();
    await repo.putBudget(budget);
    expect(await repo.listBudgets()).toEqual([budget]);

    // Same category, different id violates the unique categoryId index.
    await expect(repo.putBudget(makeBudget({ categoryId: 'groceries' }))).rejects.toThrow();
  });

  it('returns defaults when settings are missing and validates stored values', async () => {
    expect(await repo.getSettings()).toEqual(DEFAULT_SETTINGS);

    await repo.saveSettings({ locale: 'es', currency: 'MXN', speakResponses: false });
    expect(await repo.getSettings()).toEqual({
      locale: 'es',
      currency: 'MXN',
      speakResponses: false,
    });
  });

  it('clearAll removes every record', async () => {
    await repo.putTransaction(makeTx());
    await repo.putBudget(makeBudget());
    await repo.saveSettings({ locale: 'es', currency: 'USD', speakResponses: true });

    await repo.clearAll();

    expect(await repo.listTransactions()).toEqual([]);
    expect(await repo.listBudgets()).toEqual([]);
    expect(await repo.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('skips corrupted rows on read instead of failing the whole list', async () => {
    const factory = new IDBFactory();
    const isolated = await Repository.open(factory);
    const good = makeTx();
    await isolated.putTransaction(good);

    // Bypass the repository to simulate corruption written by an older/buggy build.
    const raw = await openDatabase(factory);
    const rawTx = raw.transaction(STORE_TRANSACTIONS, 'readwrite');
    rawTx.objectStore(STORE_TRANSACTIONS).put({ id: 'corrupt-1', amount: 'twelve' });
    await transactionDone(rawTx);
    raw.close();

    expect(await isolated.listTransactions()).toEqual([good]);
  });
});
