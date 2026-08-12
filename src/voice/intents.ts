import type { Cents } from '@/domain/money';
import type { CategoryId, TransactionKind } from '@/domain/types';

export type Page = 'dashboard' | 'transactions' | 'budgets' | 'insights' | 'settings';

export type QueryPeriod = 'today' | 'this-month' | 'last-month';

/** Typed result of parsing one voice transcript. */
export type Intent =
  | {
      type: 'add-transaction';
      kind: TransactionKind;
      amount: Cents;
      categoryId: CategoryId;
    }
  | { type: 'query-spending'; period: QueryPeriod; categoryId?: CategoryId }
  | { type: 'query-balance' }
  | { type: 'set-budget'; categoryId: CategoryId; amount: Cents }
  | { type: 'navigate'; page: Page }
  | { type: 'help' }
  | { type: 'unknown'; transcript: string };
