import { DEFAULT_SETTINGS } from '@/domain/types';
import type { Budget, Settings, Transaction } from '@/domain/types';
import { isBudget, isTransaction } from '@/domain/validation';
import {
  STORE_BUDGETS,
  STORE_SETTINGS,
  STORE_TRANSACTIONS,
  openDatabase,
  promisifyRequest,
  transactionDone,
} from './db';

const SETTINGS_KEY = 'user-settings';

/**
 * Typed data-access layer over the local database. Records that fail
 * shape validation on read are skipped (never silently mutated), so one
 * corrupted row cannot take the whole app down.
 */
export class Repository {
  private constructor(private readonly db: IDBDatabase) {}

  static async open(factory?: IDBFactory, name?: string): Promise<Repository> {
    const db = await openDatabase(factory, name);
    return new Repository(db);
  }

  close(): void {
    this.db.close();
  }

  async listTransactions(): Promise<Transaction[]> {
    const tx = this.db.transaction(STORE_TRANSACTIONS, 'readonly');
    const rows = await promisifyRequest(tx.objectStore(STORE_TRANSACTIONS).getAll());
    return (rows as unknown[]).filter(isTransaction);
  }

  async putTransaction(transaction: Transaction): Promise<void> {
    if (!isTransaction(transaction)) {
      throw new Error('Refusing to persist malformed transaction');
    }
    const tx = this.db.transaction(STORE_TRANSACTIONS, 'readwrite');
    tx.objectStore(STORE_TRANSACTIONS).put(transaction);
    await transactionDone(tx);
  }

  async deleteTransaction(id: string): Promise<void> {
    const tx = this.db.transaction(STORE_TRANSACTIONS, 'readwrite');
    tx.objectStore(STORE_TRANSACTIONS).delete(id);
    await transactionDone(tx);
  }

  async listBudgets(): Promise<Budget[]> {
    const tx = this.db.transaction(STORE_BUDGETS, 'readonly');
    const rows = await promisifyRequest(tx.objectStore(STORE_BUDGETS).getAll());
    return (rows as unknown[]).filter(isBudget);
  }

  async putBudget(budget: Budget): Promise<void> {
    if (!isBudget(budget)) {
      throw new Error('Refusing to persist malformed budget');
    }
    const tx = this.db.transaction(STORE_BUDGETS, 'readwrite');
    tx.objectStore(STORE_BUDGETS).put(budget);
    await transactionDone(tx);
  }

  async deleteBudget(id: string): Promise<void> {
    const tx = this.db.transaction(STORE_BUDGETS, 'readwrite');
    tx.objectStore(STORE_BUDGETS).delete(id);
    await transactionDone(tx);
  }

  async getSettings(): Promise<Settings> {
    const tx = this.db.transaction(STORE_SETTINGS, 'readonly');
    const stored = await promisifyRequest<unknown>(
      tx.objectStore(STORE_SETTINGS).get(SETTINGS_KEY),
    );
    if (typeof stored !== 'object' || stored === null) {
      return DEFAULT_SETTINGS;
    }
    // Merge over defaults so new settings fields get sane values.
    const merged = { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
    if (merged.locale !== 'en' && merged.locale !== 'es') {
      merged.locale = DEFAULT_SETTINGS.locale;
    }
    if (typeof merged.currency !== 'string' || !/^[A-Z]{3}$/.test(merged.currency)) {
      merged.currency = DEFAULT_SETTINGS.currency;
    }
    if (typeof merged.speakResponses !== 'boolean') {
      merged.speakResponses = DEFAULT_SETTINGS.speakResponses;
    }
    return merged;
  }

  async saveSettings(settings: Settings): Promise<void> {
    const tx = this.db.transaction(STORE_SETTINGS, 'readwrite');
    tx.objectStore(STORE_SETTINGS).put(settings, SETTINGS_KEY);
    await transactionDone(tx);
  }

  /** Removes every record. Used by the user-facing "erase my data" control. */
  async clearAll(): Promise<void> {
    const tx = this.db.transaction(
      [STORE_TRANSACTIONS, STORE_BUDGETS, STORE_SETTINGS],
      'readwrite',
    );
    tx.objectStore(STORE_TRANSACTIONS).clear();
    tx.objectStore(STORE_BUDGETS).clear();
    tx.objectStore(STORE_SETTINGS).clear();
    await transactionDone(tx);
  }
}
