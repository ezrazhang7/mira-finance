import type { Category, CategoryId, TransactionKind } from './types';

/**
 * Fixed category taxonomy. Labels are resolved through the i18n layer;
 * ids are stable and safe to persist.
 */
export const CATEGORIES: readonly Category[] = [
  { id: 'groceries', kind: 'expense', icon: '🛒' },
  { id: 'dining', kind: 'expense', icon: '🍽️' },
  { id: 'transport', kind: 'expense', icon: '🚌' },
  { id: 'housing', kind: 'expense', icon: '🏠' },
  { id: 'utilities', kind: 'expense', icon: '💡' },
  { id: 'health', kind: 'expense', icon: '🩺' },
  { id: 'education', kind: 'expense', icon: '📚' },
  { id: 'entertainment', kind: 'expense', icon: '🎬' },
  { id: 'personal', kind: 'expense', icon: '🧍' },
  { id: 'family', kind: 'expense', icon: '👪' },
  { id: 'savings', kind: 'expense', icon: '🏦' },
  { id: 'other', kind: 'expense', icon: '🧾' },
  { id: 'salary', kind: 'income', icon: '💼' },
  { id: 'gifts', kind: 'income', icon: '🎁' },
  { id: 'other-income', kind: 'income', icon: '💵' },
];

const byId = new Map<CategoryId, Category>(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): Category {
  const category = byId.get(id);
  if (!category) {
    throw new Error(`Unknown category id: ${id}`);
  }
  return category;
}

export function isCategoryId(value: string): value is CategoryId {
  return byId.has(value as CategoryId);
}

export function categoriesForKind(kind: TransactionKind): readonly Category[] {
  return CATEGORIES.filter((c) => c.kind === kind);
}

/** Fallback category per kind, used when a voice command names no category. */
export function fallbackCategory(kind: TransactionKind): CategoryId {
  return kind === 'expense' ? 'other' : 'other-income';
}
