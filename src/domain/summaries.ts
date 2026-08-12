import { monthKeyOf, shiftMonthKey, todayISO } from './dates';
import { subtractCents, sumCents } from './money';
import type { Cents } from './money';
import type { CategoryId, Transaction } from './types';
import type { QueryPeriod } from '@/voice/intents';

/** All income minus all spending, across all time. */
export function totalBalance(transactions: readonly Transaction[]): Cents {
  const income = sumCents(transactions.filter((t) => t.kind === 'income').map((t) => t.amount));
  const spent = sumCents(transactions.filter((t) => t.kind === 'expense').map((t) => t.amount));
  return subtractCents(income, spent);
}

export interface MonthTotals {
  spent: Cents;
  earned: Cents;
}

export function monthTotals(transactions: readonly Transaction[], monthKey: string): MonthTotals {
  const inMonth = transactions.filter((t) => monthKeyOf(t.date) === monthKey);
  return {
    spent: sumCents(inMonth.filter((t) => t.kind === 'expense').map((t) => t.amount)),
    earned: sumCents(inMonth.filter((t) => t.kind === 'income').map((t) => t.amount)),
  };
}

/** Expense totals per category for one month, largest first. */
export function spentByCategory(
  transactions: readonly Transaction[],
  monthKey: string,
): { categoryId: CategoryId; amount: Cents }[] {
  const totals = new Map<CategoryId, Cents>();
  for (const t of transactions) {
    if (t.kind === 'expense' && monthKeyOf(t.date) === monthKey) {
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
    }
  }
  return [...totals.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Spending total for a voice-query period, optionally scoped to one
 * category. `now` is injectable for tests.
 */
export function spentInPeriod(
  transactions: readonly Transaction[],
  period: QueryPeriod,
  categoryId?: CategoryId,
  now: Date = new Date(),
): Cents {
  const today = todayISO(now);
  const thisMonth = monthKeyOf(today);
  const matchesPeriod = (t: Transaction): boolean => {
    switch (period) {
      case 'today':
        return t.date === today;
      case 'this-month':
        return monthKeyOf(t.date) === thisMonth;
      case 'last-month':
        return monthKeyOf(t.date) === shiftMonthKey(thisMonth, -1);
    }
  };
  return sumCents(
    transactions
      .filter((t) => t.kind === 'expense' && matchesPeriod(t))
      .filter((t) => (categoryId ? t.categoryId === categoryId : true))
      .map((t) => t.amount),
  );
}
