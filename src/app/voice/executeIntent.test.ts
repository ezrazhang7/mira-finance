import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { todayISO } from '@/domain/dates';
import type { Transaction } from '@/domain/types';
import type { WriteResult } from '@/store/AppStore';
import { I18nProvider, useI18n } from '@/i18n/I18nProvider';
import type { I18n } from '@/i18n/I18nProvider';
import { executeIntent } from './executeIntent';
import type { IntentContext } from './executeIntent';

function i18nFor(locale: 'en' | 'es'): I18n {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(I18nProvider, { locale, currency: 'USD', children });
  return renderHook(() => useI18n(), { wrapper }).result.current;
}

function makeCtx(overrides: Partial<IntentContext> = {}): IntentContext {
  return {
    transactions: [],
    addTransaction: vi.fn(async (): Promise<WriteResult> => ({ ok: true })),
    saveBudget: vi.fn(async (): Promise<WriteResult> => ({ ok: true })),
    navigate: vi.fn(),
    i18n: i18nFor('en'),
    ...overrides,
  };
}

const expenseToday: Transaction = {
  id: 't1',
  kind: 'expense',
  amount: 2500,
  categoryId: 'groceries',
  note: '',
  date: todayISO(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('executeIntent', () => {
  it('adds an expense dated today and confirms', async () => {
    const ctx = makeCtx();
    const reply = await executeIntent(
      { type: 'add-transaction', kind: 'expense', amount: 1250, categoryId: 'groceries' },
      ctx,
    );
    expect(ctx.addTransaction).toHaveBeenCalledWith({
      kind: 'expense',
      amount: 1250,
      categoryId: 'groceries',
      note: '',
      date: todayISO(),
    });
    expect(reply).toBe('Added a $12.50 expense in Groceries.');
  });

  it('reports a save failure honestly', async () => {
    const ctx = makeCtx({
      addTransaction: vi.fn(async (): Promise<WriteResult> => ({
        ok: false,
        errors: ['persistence-failed'],
      })),
    });
    const reply = await executeIntent(
      { type: 'add-transaction', kind: 'expense', amount: 1250, categoryId: 'groceries' },
      ctx,
    );
    expect(reply).toBe('I understood, but saving failed. Please try again.');
  });

  it('answers spending queries from live data', async () => {
    const ctx = makeCtx({ transactions: [expenseToday] });
    expect(await executeIntent({ type: 'query-spending', period: 'this-month' }, ctx)).toBe(
      'You spent $25.00 this month.',
    );
    expect(
      await executeIntent(
        { type: 'query-spending', period: 'today', categoryId: 'groceries' },
        ctx,
      ),
    ).toBe('You spent $25.00 on Groceries today.');
  });

  it('answers balance queries', async () => {
    const ctx = makeCtx({ transactions: [expenseToday] });
    expect(await executeIntent({ type: 'query-balance' }, ctx)).toBe('Your balance is -$25.00.');
  });

  it('sets budgets and confirms', async () => {
    const ctx = makeCtx();
    const reply = await executeIntent(
      { type: 'set-budget', categoryId: 'groceries', amount: 30000 },
      ctx,
    );
    expect(ctx.saveBudget).toHaveBeenCalledWith({ categoryId: 'groceries', monthlyLimit: 30000 });
    expect(reply).toBe('Budget for Groceries set to $300.00 per month.');
  });

  it('navigates and names the destination', async () => {
    const ctx = makeCtx();
    const reply = await executeIntent({ type: 'navigate', page: 'budgets' }, ctx);
    expect(ctx.navigate).toHaveBeenCalledWith('budgets');
    expect(reply).toBe('Opening Budgets.');
  });

  it('replies in Spanish when the locale is Spanish', async () => {
    const ctx = makeCtx({ i18n: i18nFor('es') });
    const reply = await executeIntent(
      { type: 'add-transaction', kind: 'expense', amount: 1250, categoryId: 'groceries' },
      ctx,
    );
    expect(reply).toBe('Agregué un gasto de $12.50 en Despensa.');
  });

  it('handles help and unknown', async () => {
    const ctx = makeCtx();
    expect(await executeIntent({ type: 'help' }, ctx)).toContain('I spent 12.50 on groceries');
    expect(await executeIntent({ type: 'unknown', transcript: 'blah' }, ctx)).toContain(
      'I did not catch that',
    );
  });
});
