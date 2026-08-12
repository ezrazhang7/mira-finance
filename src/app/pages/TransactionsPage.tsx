import { useState } from 'react';
import type { Transaction, TransactionKind } from '@/domain/types';
import { useAppStore } from '@/store/AppStore';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Dialog } from '@/ui/Dialog';
import { Segmented } from '@/ui/Segmented';
import { Toast } from '@/ui/Toast';
import { PlusIcon } from '@/app/icons';
import { TransactionForm } from '@/app/components/TransactionForm';
import { TransactionRow } from '@/app/components/TransactionRow';

type Filter = 'all' | TransactionKind;

type DialogState =
  { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; transaction: Transaction };

type ToastState = { message: string; undoable: boolean } | null;

export function TransactionsPage() {
  const store = useAppStore();
  const { t } = useI18n();

  const [filter, setFilter] = useState<Filter>('all');
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });
  const [toast, setToast] = useState<ToastState>(null);

  const visible =
    filter === 'all' ? store.transactions : store.transactions.filter((t) => t.kind === filter);

  const closeDialog = () => setDialog({ mode: 'closed' });

  const handleDelete = async () => {
    if (dialog.mode !== 'edit') {
      return;
    }
    const result = await store.deleteTransaction(dialog.transaction.id);
    closeDialog();
    if (result.ok) {
      setToast({ message: t('transactions.deleted'), undoable: true });
    } else {
      setToast({ message: t('error.persistence-failed'), undoable: false });
    }
  };

  const handleUndo = async () => {
    setToast(null);
    await store.undoDelete();
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{t('transactions.title')}</h1>
        <Button onClick={() => setDialog({ mode: 'add' })}>
          <PlusIcon /> {t('transactions.add')}
        </Button>
      </div>

      <Segmented
        label={t('transactions.kind')}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('transactions.filterAll') },
          { value: 'expense', label: t('transactions.expense') },
          { value: 'income', label: t('transactions.income') },
        ]}
      />

      <Card>
        {visible.length === 0 ? (
          <p className="empty-state">{t('transactions.empty')}</p>
        ) : (
          <ul className="tx-list">
            {visible.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onSelect={(tx) => setDialog({ mode: 'edit', transaction: tx })}
              />
            ))}
          </ul>
        )}
      </Card>

      <Dialog
        open={dialog.mode !== 'closed'}
        title={dialog.mode === 'edit' ? t('transactions.edit') : t('transactions.add')}
        onClose={closeDialog}
      >
        {dialog.mode !== 'closed' ? (
          <TransactionForm
            initial={dialog.mode === 'edit' ? dialog.transaction : null}
            onSubmit={async (draft) => {
              const result =
                dialog.mode === 'edit'
                  ? await store.updateTransaction(dialog.transaction.id, draft)
                  : await store.addTransaction(draft);
              if (result.ok) {
                closeDialog();
                setToast({ message: t('transactions.saved'), undoable: false });
              }
              return result;
            }}
            onCancel={closeDialog}
            {...(dialog.mode === 'edit' ? { onDelete: handleDelete } : {})}
          />
        ) : null}
      </Dialog>

      {toast ? (
        <Toast
          message={toast.message}
          onDismiss={() => setToast(null)}
          {...(toast.undoable ? { actionLabel: t('transactions.undo'), onAction: handleUndo } : {})}
        />
      ) : null}
    </>
  );
}
