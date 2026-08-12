import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import { newId } from '@/domain/id';
import type { Budget, Settings, Transaction } from '@/domain/types';
import { DEFAULT_SETTINGS } from '@/domain/types';
import { validateDraftBudget, validateDraftTransaction } from '@/domain/validation';
import type { DraftBudget, DraftTransaction, ValidationErrorCode } from '@/domain/validation';
import { Repository } from '@/storage/repository';

export type WriteErrorCode = ValidationErrorCode | 'persistence-failed';

export type WriteResult = { ok: true } | { ok: false; errors: WriteErrorCode[] };

interface AppState {
  status: 'loading' | 'ready' | 'error';
  transactions: Transaction[];
  budgets: Budget[];
  settings: Settings;
  /** Most recently deleted transaction, still undoable. */
  pendingUndo: Transaction | null;
  errorMessage: string | null;
}

type Action =
  | { type: 'hydrated'; transactions: Transaction[]; budgets: Budget[]; settings: Settings }
  | { type: 'hydrate-failed'; message: string }
  | { type: 'upsert-transaction'; transaction: Transaction }
  | { type: 'remove-transaction'; id: string; undoable: Transaction | null }
  | { type: 'clear-pending-undo' }
  | { type: 'upsert-budget'; budget: Budget }
  | { type: 'remove-budget'; id: string }
  | { type: 'set-settings'; settings: Settings }
  | { type: 'erased' };

function byDateDesc(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }
  return a.createdAt < b.createdAt ? 1 : -1;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrated':
      return {
        status: 'ready',
        transactions: [...action.transactions].sort(byDateDesc),
        budgets: action.budgets,
        settings: action.settings,
        pendingUndo: null,
        errorMessage: null,
      };
    case 'hydrate-failed':
      return { ...state, status: 'error', errorMessage: action.message };
    case 'upsert-transaction': {
      const rest = state.transactions.filter((t) => t.id !== action.transaction.id);
      return {
        ...state,
        transactions: [...rest, action.transaction].sort(byDateDesc),
      };
    }
    case 'remove-transaction':
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.id),
        pendingUndo: action.undoable,
      };
    case 'clear-pending-undo':
      return { ...state, pendingUndo: null };
    case 'upsert-budget': {
      const rest = state.budgets.filter((b) => b.id !== action.budget.id);
      return { ...state, budgets: [...rest, action.budget] };
    }
    case 'remove-budget':
      return { ...state, budgets: state.budgets.filter((b) => b.id !== action.id) };
    case 'set-settings':
      return { ...state, settings: action.settings };
    case 'erased':
      return {
        status: 'ready',
        transactions: [],
        budgets: [],
        settings: DEFAULT_SETTINGS,
        pendingUndo: null,
        errorMessage: null,
      };
  }
}

const INITIAL_STATE: AppState = {
  status: 'loading',
  transactions: [],
  budgets: [],
  settings: DEFAULT_SETTINGS,
  pendingUndo: null,
  errorMessage: null,
};

export interface AppStore extends AppState {
  addTransaction: (draft: DraftTransaction) => Promise<WriteResult>;
  updateTransaction: (id: string, draft: DraftTransaction) => Promise<WriteResult>;
  deleteTransaction: (id: string) => Promise<WriteResult>;
  undoDelete: () => Promise<WriteResult>;
  saveBudget: (draft: DraftBudget) => Promise<WriteResult>;
  deleteBudget: (id: string) => Promise<WriteResult>;
  updateSettings: (settings: Settings) => Promise<WriteResult>;
  eraseAllData: () => Promise<WriteResult>;
}

const AppStoreContext = createContext<AppStore | null>(null);

const PERSISTENCE_FAILED: WriteResult = { ok: false, errors: ['persistence-failed'] };

export function AppStoreProvider({
  children,
  openRepository = () => Repository.open(),
}: {
  children: ReactNode;
  /** Injectable for tests; defaults to the real local database. */
  openRepository?: () => Promise<Repository>;
}) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const repoRef = useRef<Repository | null>(null);
  // React batches renders, so `state` can lag behind dispatched actions.
  // `commit` folds each action into this ref synchronously, making it the
  // authoritative state for callbacks — rapid successive commands (e.g.
  // consecutive voice actions) always see their predecessors' effects.
  const stateRef = useRef(INITIAL_STATE);
  const commit = useCallback((action: Action) => {
    stateRef.current = reducer(stateRef.current, action);
    dispatch(action);
  }, []);

  // The database is opened exactly once per provider mount. A ref pins
  // the opener: callers pass inline arrow functions, and letting a new
  // prop identity re-run this effect would close the repository out from
  // under in-flight writes (a bug caught in real-browser testing).
  const openRepositoryRef = useRef(openRepository);

  useEffect(() => {
    let cancelled = false;
    let repo: Repository | null = null;
    (async () => {
      try {
        repo = await openRepositoryRef.current();
        const [transactions, budgets, settings] = await Promise.all([
          repo.listTransactions(),
          repo.listBudgets(),
          repo.getSettings(),
        ]);
        if (cancelled) {
          repo.close();
          return;
        }
        repoRef.current = repo;
        commit({ type: 'hydrated', transactions, budgets, settings });
      } catch (error) {
        if (!cancelled) {
          commit({
            type: 'hydrate-failed',
            message: error instanceof Error ? error.message : 'Failed to open local storage',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      repoRef.current = null;
      repo?.close();
    };
  }, [commit]);

  const addTransaction = useCallback(
    async (draft: DraftTransaction): Promise<WriteResult> => {
      const errors = validateDraftTransaction(draft);
      if (errors.length > 0) {
        return { ok: false, errors };
      }
      const repo = repoRef.current;
      if (!repo) {
        return PERSISTENCE_FAILED;
      }
      const now = new Date().toISOString();
      const transaction: Transaction = {
        id: newId(),
        kind: draft.kind,
        amount: draft.amount,
        categoryId: draft.categoryId as Transaction['categoryId'],
        note: draft.note,
        date: draft.date,
        createdAt: now,
        updatedAt: now,
      };
      commit({ type: 'upsert-transaction', transaction });
      try {
        await repo.putTransaction(transaction);
        return { ok: true };
      } catch {
        commit({ type: 'remove-transaction', id: transaction.id, undoable: null });
        return PERSISTENCE_FAILED;
      }
    },
    [commit],
  );

  const updateTransaction = useCallback(
    async (id: string, draft: DraftTransaction): Promise<WriteResult> => {
      const errors = validateDraftTransaction(draft);
      if (errors.length > 0) {
        return { ok: false, errors };
      }
      const repo = repoRef.current;
      const existing = stateRef.current.transactions.find((t) => t.id === id);
      if (!repo || !existing) {
        return PERSISTENCE_FAILED;
      }
      const updated: Transaction = {
        ...existing,
        kind: draft.kind,
        amount: draft.amount,
        categoryId: draft.categoryId as Transaction['categoryId'],
        note: draft.note,
        date: draft.date,
        updatedAt: new Date().toISOString(),
      };
      commit({ type: 'upsert-transaction', transaction: updated });
      try {
        await repo.putTransaction(updated);
        return { ok: true };
      } catch {
        commit({ type: 'upsert-transaction', transaction: existing });
        return PERSISTENCE_FAILED;
      }
    },
    [commit],
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<WriteResult> => {
      const repo = repoRef.current;
      const existing = stateRef.current.transactions.find((t) => t.id === id);
      if (!repo || !existing) {
        return PERSISTENCE_FAILED;
      }
      commit({ type: 'remove-transaction', id, undoable: existing });
      try {
        await repo.deleteTransaction(id);
        return { ok: true };
      } catch {
        commit({ type: 'upsert-transaction', transaction: existing });
        commit({ type: 'clear-pending-undo' });
        return PERSISTENCE_FAILED;
      }
    },
    [commit],
  );

  const undoDelete = useCallback(async (): Promise<WriteResult> => {
    const repo = repoRef.current;
    const restore = stateRef.current.pendingUndo;
    if (!repo || !restore) {
      return PERSISTENCE_FAILED;
    }
    commit({ type: 'upsert-transaction', transaction: restore });
    commit({ type: 'clear-pending-undo' });
    try {
      await repo.putTransaction(restore);
      return { ok: true };
    } catch {
      commit({ type: 'remove-transaction', id: restore.id, undoable: null });
      return PERSISTENCE_FAILED;
    }
  }, [commit]);

  const saveBudget = useCallback(
    async (draft: DraftBudget): Promise<WriteResult> => {
      const errors = validateDraftBudget(draft);
      if (errors.length > 0) {
        return { ok: false, errors };
      }
      const repo = repoRef.current;
      if (!repo) {
        return PERSISTENCE_FAILED;
      }
      const existing = stateRef.current.budgets.find((b) => b.categoryId === draft.categoryId);
      const now = new Date().toISOString();
      const budget: Budget = existing
        ? { ...existing, monthlyLimit: draft.monthlyLimit, updatedAt: now }
        : {
            id: newId(),
            categoryId: draft.categoryId as Budget['categoryId'],
            monthlyLimit: draft.monthlyLimit,
            createdAt: now,
            updatedAt: now,
          };
      commit({ type: 'upsert-budget', budget });
      try {
        await repo.putBudget(budget);
        return { ok: true };
      } catch {
        if (existing) {
          commit({ type: 'upsert-budget', budget: existing });
        } else {
          commit({ type: 'remove-budget', id: budget.id });
        }
        return PERSISTENCE_FAILED;
      }
    },
    [commit],
  );

  const deleteBudget = useCallback(
    async (id: string): Promise<WriteResult> => {
      const repo = repoRef.current;
      const existing = stateRef.current.budgets.find((b) => b.id === id);
      if (!repo || !existing) {
        return PERSISTENCE_FAILED;
      }
      commit({ type: 'remove-budget', id });
      try {
        await repo.deleteBudget(id);
        return { ok: true };
      } catch {
        commit({ type: 'upsert-budget', budget: existing });
        return PERSISTENCE_FAILED;
      }
    },
    [commit],
  );

  const updateSettings = useCallback(
    async (settings: Settings): Promise<WriteResult> => {
      const repo = repoRef.current;
      if (!repo) {
        return PERSISTENCE_FAILED;
      }
      const previous = stateRef.current.settings;
      commit({ type: 'set-settings', settings });
      try {
        await repo.saveSettings(settings);
        return { ok: true };
      } catch {
        commit({ type: 'set-settings', settings: previous });
        return PERSISTENCE_FAILED;
      }
    },
    [commit],
  );

  const eraseAllData = useCallback(async (): Promise<WriteResult> => {
    const repo = repoRef.current;
    if (!repo) {
      return PERSISTENCE_FAILED;
    }
    try {
      await repo.clearAll();
      commit({ type: 'erased' });
      return { ok: true };
    } catch {
      return PERSISTENCE_FAILED;
    }
  }, [commit]);

  const store = useMemo<AppStore>(
    () => ({
      ...state,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      undoDelete,
      saveBudget,
      deleteBudget,
      updateSettings,
      eraseAllData,
    }),
    [
      state,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      undoDelete,
      saveBudget,
      deleteBudget,
      updateSettings,
      eraseAllData,
    ],
  );

  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook + provider form one module API
export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error('useAppStore must be used within AppStoreProvider');
  }
  return store;
}
