import { describe, expect, it } from 'vitest';
import {
  MAX_AMOUNT_CENTS,
  MAX_NOTE_LENGTH,
  isBudget,
  isTransaction,
  validateDraftBudget,
  validateDraftTransaction,
} from './validation';
import type { DraftTransaction } from './validation';

const validDraft: DraftTransaction = {
  kind: 'expense',
  amount: 1250,
  categoryId: 'groceries',
  note: 'weekly shop',
  date: '2026-08-12',
};

describe('validateDraftTransaction', () => {
  it('passes a valid draft', () => {
    expect(validateDraftTransaction(validDraft)).toEqual([]);
  });

  it('flags non-positive, oversized, and fractional amounts', () => {
    expect(validateDraftTransaction({ ...validDraft, amount: 0 })).toContain('amount-not-positive');
    expect(validateDraftTransaction({ ...validDraft, amount: -100 })).toContain(
      'amount-not-positive',
    );
    expect(validateDraftTransaction({ ...validDraft, amount: MAX_AMOUNT_CENTS + 1 })).toContain(
      'amount-too-large',
    );
    expect(validateDraftTransaction({ ...validDraft, amount: 12.5 })).toContain(
      'amount-not-integer',
    );
  });

  it('flags unknown categories and kind mismatches', () => {
    expect(validateDraftTransaction({ ...validDraft, categoryId: 'nope' })).toContain(
      'invalid-category',
    );
    expect(validateDraftTransaction({ ...validDraft, categoryId: 'salary' })).toContain(
      'category-kind-mismatch',
    );
  });

  it('flags bad dates and oversized notes', () => {
    expect(validateDraftTransaction({ ...validDraft, date: 'yesterday' })).toContain(
      'invalid-date',
    );
    expect(
      validateDraftTransaction({ ...validDraft, note: 'x'.repeat(MAX_NOTE_LENGTH + 1) }),
    ).toContain('note-too-long');
  });
});

describe('validateDraftBudget', () => {
  it('passes a valid budget and rejects income categories', () => {
    expect(validateDraftBudget({ categoryId: 'groceries', monthlyLimit: 30000 })).toEqual([]);
    expect(validateDraftBudget({ categoryId: 'salary', monthlyLimit: 30000 })).toContain(
      'category-kind-mismatch',
    );
    expect(validateDraftBudget({ categoryId: 'groceries', monthlyLimit: 0 })).toContain(
      'amount-not-positive',
    );
  });
});

describe('persisted-shape guards', () => {
  const tx = {
    id: 'abc',
    kind: 'expense',
    amount: 100,
    categoryId: 'dining',
    note: '',
    date: '2026-08-01',
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
  };

  it('accepts well-formed records', () => {
    expect(isTransaction(tx)).toBe(true);
    expect(
      isBudget({
        id: 'b1',
        categoryId: 'groceries',
        monthlyLimit: 30000,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      }),
    ).toBe(true);
  });

  it('rejects corrupted records', () => {
    expect(isTransaction(null)).toBe(false);
    expect(isTransaction({ ...tx, amount: -5 })).toBe(false);
    expect(isTransaction({ ...tx, categoryId: 'bogus' })).toBe(false);
    expect(isTransaction({ ...tx, date: 'not-a-date' })).toBe(false);
    expect(isBudget({ id: 'b1' })).toBe(false);
  });
});
