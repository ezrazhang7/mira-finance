import type { Cents } from './money';

export type TransactionKind = 'expense' | 'income';

export type CategoryId =
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'housing'
  | 'utilities'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'personal'
  | 'family'
  | 'savings'
  | 'other'
  | 'salary'
  | 'gifts'
  | 'other-income';

export interface Category {
  id: CategoryId;
  kind: TransactionKind;
  /** Emoji used as a language-neutral visual marker. */
  icon: string;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  /** Always positive; `kind` carries the sign. */
  amount: Cents;
  categoryId: CategoryId;
  /** Free-text note; may be empty. */
  note: string;
  /** Local calendar date, ISO `yyyy-mm-dd`. */
  date: string;
  /** ISO timestamps for auditability and stable ordering. */
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  categoryId: CategoryId;
  /** Spending limit per calendar month. */
  monthlyLimit: Cents;
  createdAt: string;
  updatedAt: string;
}

/** User preferences persisted alongside the data. */
export interface Settings {
  locale: 'en' | 'es';
  currency: string;
  /** Whether spoken confirmations are read aloud. */
  speakResponses: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  locale: 'en',
  currency: 'USD',
  speakResponses: true,
};
