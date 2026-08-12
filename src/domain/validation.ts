import { isCategoryId, getCategory } from './categories';
import { isISODate } from './dates';
import type { Cents } from './money';
import type { Budget, Transaction, TransactionKind } from './types';

/** One million dollars in cents — sanity ceiling for a single entry. */
export const MAX_AMOUNT_CENTS: Cents = 100_000_000;
export const MAX_NOTE_LENGTH = 200;

export type ValidationErrorCode =
  | 'amount-not-positive'
  | 'amount-too-large'
  | 'amount-not-integer'
  | 'invalid-category'
  | 'category-kind-mismatch'
  | 'invalid-date'
  | 'note-too-long';

export interface DraftTransaction {
  kind: TransactionKind;
  amount: Cents;
  categoryId: string;
  note: string;
  date: string;
}

export interface DraftBudget {
  categoryId: string;
  monthlyLimit: Cents;
}

export function validateDraftTransaction(draft: DraftTransaction): ValidationErrorCode[] {
  const errors: ValidationErrorCode[] = [];
  if (!Number.isSafeInteger(draft.amount)) {
    errors.push('amount-not-integer');
  } else if (draft.amount <= 0) {
    errors.push('amount-not-positive');
  } else if (draft.amount > MAX_AMOUNT_CENTS) {
    errors.push('amount-too-large');
  }

  if (!isCategoryId(draft.categoryId)) {
    errors.push('invalid-category');
  } else if (getCategory(draft.categoryId).kind !== draft.kind) {
    errors.push('category-kind-mismatch');
  }

  if (!isISODate(draft.date)) {
    errors.push('invalid-date');
  }
  if (draft.note.length > MAX_NOTE_LENGTH) {
    errors.push('note-too-long');
  }
  return errors;
}

export function validateDraftBudget(draft: DraftBudget): ValidationErrorCode[] {
  const errors: ValidationErrorCode[] = [];
  if (!Number.isSafeInteger(draft.monthlyLimit)) {
    errors.push('amount-not-integer');
  } else if (draft.monthlyLimit <= 0) {
    errors.push('amount-not-positive');
  } else if (draft.monthlyLimit > MAX_AMOUNT_CENTS) {
    errors.push('amount-too-large');
  }

  if (!isCategoryId(draft.categoryId)) {
    errors.push('invalid-category');
  } else if (getCategory(draft.categoryId).kind !== 'expense') {
    errors.push('category-kind-mismatch');
  }
  return errors;
}

/** Type guards used when reading persisted or imported data. */
export function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    t.id.length > 0 &&
    (t.kind === 'expense' || t.kind === 'income') &&
    typeof t.amount === 'number' &&
    Number.isSafeInteger(t.amount) &&
    t.amount > 0 &&
    typeof t.categoryId === 'string' &&
    isCategoryId(t.categoryId) &&
    typeof t.note === 'string' &&
    typeof t.date === 'string' &&
    isISODate(t.date) &&
    typeof t.createdAt === 'string' &&
    typeof t.updatedAt === 'string'
  );
}

export function isBudget(value: unknown): value is Budget {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const b = value as Record<string, unknown>;
  return (
    typeof b.id === 'string' &&
    b.id.length > 0 &&
    typeof b.categoryId === 'string' &&
    isCategoryId(b.categoryId) &&
    typeof b.monthlyLimit === 'number' &&
    Number.isSafeInteger(b.monthlyLimit) &&
    b.monthlyLimit > 0 &&
    typeof b.createdAt === 'string' &&
    typeof b.updatedAt === 'string'
  );
}
