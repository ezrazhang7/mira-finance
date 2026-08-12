import { useState } from 'react';
import type { FormEvent } from 'react';
import { categoriesForKind } from '@/domain/categories';
import { todayISO } from '@/domain/dates';
import { parseAmountToCents } from '@/domain/money';
import type { Transaction, TransactionKind } from '@/domain/types';
import { MAX_NOTE_LENGTH } from '@/domain/validation';
import type { DraftTransaction } from '@/domain/validation';
import type { WriteResult } from '@/store/AppStore';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Segmented } from '@/ui/Segmented';

export interface TransactionFormProps {
  /** Existing transaction when editing; null when adding. */
  initial: Transaction | null;
  onSubmit: (draft: DraftTransaction) => Promise<WriteResult>;
  onCancel: () => void;
  onDelete?: () => void;
}

interface FormErrors {
  amount?: string;
  category?: string;
  date?: string;
  note?: string;
  general?: string;
}

export function TransactionForm({ initial, onSubmit, onCancel, onDelete }: TransactionFormProps) {
  const { t, categoryName } = useI18n();

  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? 'expense');
  const [amountText, setAmountText] = useState(initial ? (initial.amount / 100).toFixed(2) : '');
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? 'groceries');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const categories = categoriesForKind(kind);
  const effectiveCategoryId = categories.some((c) => c.id === categoryId)
    ? categoryId
    : categories[0]!.id;

  const changeKind = (nextKind: TransactionKind) => {
    setKind(nextKind);
    const nextCategories = categoriesForKind(nextKind);
    if (!nextCategories.some((c) => c.id === categoryId)) {
      setCategoryId(nextCategories[0]!.id);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const nextErrors: FormErrors = {};
    const amount = parseAmountToCents(amountText);
    if (amount === null) {
      nextErrors.amount = t('error.amount-unparseable');
    }
    if (note.length > MAX_NOTE_LENGTH) {
      nextErrors.note = t('error.note-too-long', { max: MAX_NOTE_LENGTH });
    }
    if (Object.keys(nextErrors).length > 0 || amount === null) {
      setErrors(nextErrors);
      return;
    }

    const draft: DraftTransaction = {
      kind,
      amount,
      categoryId: effectiveCategoryId,
      note: note.trim(),
      date,
    };

    setSubmitting(true);
    try {
      const result = await onSubmit(draft);
      if (!result.ok) {
        const mapped: FormErrors = {};
        for (const code of result.errors) {
          switch (code) {
            case 'amount-not-positive':
            case 'amount-too-large':
            case 'amount-not-integer':
              mapped.amount = t(`error.${code}`);
              break;
            case 'invalid-category':
            case 'category-kind-mismatch':
              mapped.category = t(`error.${code}`);
              break;
            case 'invalid-date':
              mapped.date = t(`error.${code}`);
              break;
            case 'note-too-long':
              mapped.note = t('error.note-too-long', { max: MAX_NOTE_LENGTH });
              break;
            case 'persistence-failed':
              mapped.general = t('error.persistence-failed');
              break;
          }
        }
        setErrors(mapped);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="tx-form" noValidate>
      <Segmented
        label={t('transactions.kind')}
        value={kind}
        onChange={changeKind}
        options={[
          { value: 'expense', label: t('transactions.expense') },
          { value: 'income', label: t('transactions.income') },
        ]}
      />

      <Field label={t('transactions.amount')} {...(errors.amount ? { error: errors.amount } : {})}>
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

      <Field
        label={t('transactions.category')}
        {...(errors.category ? { error: errors.category } : {})}
      >
        <select value={effectiveCategoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon} {categoryName(category.id)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('transactions.date')} {...(errors.date ? { error: errors.date } : {})}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>

      <Field label={t('transactions.note')} {...(errors.note ? { error: errors.note } : {})}>
        <input
          type="text"
          value={note}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {errors.general ? (
        <p className="field__error" role="alert">
          {errors.general}
        </p>
      ) : null}

      <div className="dialog__actions">
        {onDelete ? (
          <Button variant="danger" onClick={onDelete} disabled={submitting}>
            {t('transactions.delete')}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          {t('transactions.cancel')}
        </Button>
        <Button type="submit" disabled={submitting}>
          {t('transactions.save')}
        </Button>
      </div>
    </form>
  );
}
