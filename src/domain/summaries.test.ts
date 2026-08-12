import { describe, expect, it } from 'vitest';
import { monthTotals, spentByCategory, spentInPeriod, totalBalance } from './summaries';
import type { Transaction } from './types';

let counter = 0;
function tx(overrides: Partial<Transaction>): Transaction {
  counter += 1;
  return {
    id: `t${counter}`,
    kind: 'expense',
    amount: 1000,
    categoryId: 'groceries',
    note: '',
    date: '2026-08-10',
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-10T10:00:00.000Z',
    ...overrides,
  };
}

const sample: Transaction[] = [
  tx({ kind: 'income', categoryId: 'salary', amount: 100000, date: '2026-08-01' }),
  tx({ amount: 2500, categoryId: 'groceries', date: '2026-08-05' }),
  tx({ amount: 1500, categoryId: 'dining', date: '2026-08-12' }),
  tx({ amount: 4000, categoryId: 'groceries', date: '2026-07-20' }),
  tx({ kind: 'income', categoryId: 'gifts', amount: 5000, date: '2026-07-15' }),
];

describe('totalBalance', () => {
  it('sums income minus expenses across all time', () => {
    expect(totalBalance(sample)).toBe(100000 + 5000 - 2500 - 1500 - 4000);
  });
});

describe('monthTotals', () => {
  it('splits spent and earned for one month', () => {
    expect(monthTotals(sample, '2026-08')).toEqual({ spent: 4000, earned: 100000 });
    expect(monthTotals(sample, '2026-07')).toEqual({ spent: 4000, earned: 5000 });
    expect(monthTotals(sample, '2026-01')).toEqual({ spent: 0, earned: 0 });
  });
});

describe('spentByCategory', () => {
  it('totals expenses per category, largest first', () => {
    expect(spentByCategory(sample, '2026-08')).toEqual([
      { categoryId: 'groceries', amount: 2500 },
      { categoryId: 'dining', amount: 1500 },
    ]);
  });
});

describe('spentInPeriod', () => {
  const now = new Date(2026, 7, 12); // 2026-08-12 local

  it('handles today, this month, and last month', () => {
    expect(spentInPeriod(sample, 'today', undefined, now)).toBe(1500);
    expect(spentInPeriod(sample, 'this-month', undefined, now)).toBe(4000);
    expect(spentInPeriod(sample, 'last-month', undefined, now)).toBe(4000);
  });

  it('scopes to a category', () => {
    expect(spentInPeriod(sample, 'this-month', 'groceries', now)).toBe(2500);
    expect(spentInPeriod(sample, 'this-month', 'transport', now)).toBe(0);
  });
});
