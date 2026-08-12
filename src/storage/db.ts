/**
 * Thin promise wrapper over IndexedDB with explicit schema versioning.
 *
 * All user data stays in this browser-local database — Mira has no
 * backend by design. Schema changes must bump DB_VERSION and add an
 * upgrade step in `applyMigrations` so existing users migrate in place.
 */
export const DB_NAME = 'mira-finance';
export const DB_VERSION = 1;

export const STORE_TRANSACTIONS = 'transactions';
export const STORE_BUDGETS = 'budgets';
export const STORE_SETTINGS = 'settings';

function applyMigrations(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    const transactions = db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id' });
    transactions.createIndex('date', 'date', { unique: false });

    const budgets = db.createObjectStore(STORE_BUDGETS, { keyPath: 'id' });
    budgets.createIndex('categoryId', 'categoryId', { unique: true });

    db.createObjectStore(STORE_SETTINGS);
  }
  // Future versions: `if (oldVersion < 2) { ... }` — never edit v1 in place.
}

export function openDatabase(
  factory: IDBFactory = indexedDB,
  name: string = DB_NAME,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, DB_VERSION);
    request.onupgradeneeded = (event) => {
      applyMigrations(request.result, event.oldVersion);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open database'));
    request.onblocked = () => reject(new Error('Database upgrade blocked by another open tab'));
  });
}

/** Wraps a single IDBRequest into a promise. */
export function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

/** Waits for a transaction to fully commit (or surfaces its failure). */
export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export function deleteDatabase(
  factory: IDBFactory = indexedDB,
  name: string = DB_NAME,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = factory.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete database'));
    request.onblocked = () => reject(new Error('Database deletion blocked by another open tab'));
  });
}
