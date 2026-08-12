import { useState } from 'react';
import type { FormEvent } from 'react';
import { categoriesForKind, getCategory } from '@/domain/categories';
import { currentMonthKey } from '@/domain/dates';
import { parseAmountToCents } from '@/domain/money';
import { spentByCategory } from '@/domain/summaries';
import type { Budget } from '@/domain/types';
import { useAppStore } from '@/store/AppStore';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Dialog } from '@/ui/Dialog';
import { Field } from '@/ui/Field';
import { PlusIcon } from '@/app/icons';

type DialogState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; budget: Budget };

function BudgetForm({
  initial,
  takenCategoryIds,
  onDone,
}: {
  initial: Budget | null;
  takenCategoryIds: ReadonlySet<string>;
  onDone: () => void;
}) {
  const store = useAppStore();
  const { t, categoryName } = useI18n();

  const available = categoriesForKind('expense').filter(
    (c) => c.id === initial?.categoryId || !takenCategoryIds.has(c.id),
  );
  const [categoryId, setCategoryId] = useState<string>(
    initial?.categoryId ?? available[0]?.id ?? 'other',
  );
  const [amountText, setAmountText] = useState(
    initial ? (initial.monthlyLimit / 100).toFixed(2) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const amount = parseAmountToCents(amountText);
    if (amount === null || amount <= 0) {
      setError(t('error.amount-unparseable'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await store.saveBudget({ categoryId, monthlyLimit: amount });
      if (result.ok) {
        onDone();
      } else {
        setError(
          t(
            result.errors.includes('persistence-failed')
              ? 'error.persistence-failed'
              : `error.${result.errors[0]!}`,
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="tx-form" onSubmit={handleSubmit} noValidate>
      <Field label={t('transactions.category')}>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={initial !== null}
        >
          {available.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon} {categoryName(category.id)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('budgets.limit')} {...(error ? { error } : {})}>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={t('transactions.amountPlaceholder')}
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
          required
        />
      </Field>

      <div className="dialog__actions">
        <Button variant="secondary" onClick={onDone} disabled={submitting}>
          {t('transactions.cancel')}
        </Button>
        <Button type="submit" disabled={submitting}>
          {t('transactions.save')}
        </Button>
      </div>
    </form>
  );
}

function BudgetMeter({ budget, spent }: { budget: Budget; spent: number }) {
  const { t, categoryName, money } = useI18n();
  const category = getCategory(budget.categoryId);
  const over = spent > budget.monthlyLimit;
  const fraction = Math.min(1, budget.monthlyLimit === 0 ? 1 : spent / budget.monthlyLimit);

  return (
    <div className="budget-meter">
      <div className="budget-meter__head">
        <span className="tx-row__icon" aria-hidden="true">
          {category.icon}
        </span>
        <span className="budget-meter__name">{categoryName(budget.categoryId)}</span>
        <span
          className={over ? 'budget-meter__delta budget-meter__delta--over' : 'budget-meter__delta'}
        >
          {over
            ? t('budgets.over', { amount: money(spent - budget.monthlyLimit) })
            : t('budgets.remaining', { amount: money(budget.monthlyLimit - spent) })}
        </span>
      </div>
      <div
        className="budget-meter__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={budget.monthlyLimit}
        aria-valuenow={Math.min(spent, budget.monthlyLimit)}
        aria-label={t('budgets.progressLabel', {
          category: categoryName(budget.categoryId),
          spent: money(spent),
          limit: money(budget.monthlyLimit),
        })}
      >
        <div
          className={over ? 'budget-meter__fill budget-meter__fill--over' : 'budget-meter__fill'}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <p className="budget-meter__caption">
        {t('budgets.spent', { spent: money(spent), limit: money(budget.monthlyLimit) })}
      </p>
    </div>
  );
}

export function BudgetsPage() {
  const store = useAppStore();
  const { t, categoryName } = useI18n();
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });

  const monthKey = currentMonthKey();
  const spentPerCategory = new Map(
    spentByCategory(store.transactions, monthKey).map((e) => [e.categoryId, e.amount]),
  );
  const budgets = [...store.budgets].sort((a, b) => a.categoryId.localeCompare(b.categoryId));
  const taken = new Set(budgets.map((b) => b.categoryId as string));
  const close = () => setDialog({ mode: 'closed' });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{t('budgets.title')}</h1>
        <Button onClick={() => setDialog({ mode: 'add' })}>
          <PlusIcon /> {t('budgets.add')}
        </Button>
      </div>

      <p className="empty-state">{t('budgets.intro')}</p>

      <Card>
        {budgets.length === 0 ? (
          <p className="empty-state">{t('budgets.empty')}</p>
        ) : (
          <ul className="budget-list">
            {budgets.map((budget) => (
              <li key={budget.id} className="budget-list__item">
                <button
                  type="button"
                  className="budget-list__button"
                  onClick={() => setDialog({ mode: 'edit', budget })}
                  aria-label={`${t('budgets.edit')}: ${categoryName(budget.categoryId)}`}
                >
                  <BudgetMeter
                    budget={budget}
                    spent={spentPerCategory.get(budget.categoryId) ?? 0}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog
        open={dialog.mode !== 'closed'}
        title={dialog.mode === 'edit' ? t('budgets.edit') : t('budgets.add')}
        onClose={close}
      >
        {dialog.mode !== 'closed' ? (
          <>
            <BudgetForm
              initial={dialog.mode === 'edit' ? dialog.budget : null}
              takenCategoryIds={taken}
              onDone={close}
            />
            {dialog.mode === 'edit' ? (
              <Button
                variant="danger"
                fullWidth
                onClick={async () => {
                  await store.deleteBudget(dialog.budget.id);
                  close();
                }}
              >
                {t('budgets.delete')}
              </Button>
            ) : null}
          </>
        ) : null}
      </Dialog>
    </>
  );
}
