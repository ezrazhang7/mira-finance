import { getCategory } from '@/domain/categories';
import type { Transaction } from '@/domain/types';
import { useI18n } from '@/i18n/I18nProvider';

export function TransactionRow({
  transaction,
  onSelect,
}: {
  transaction: Transaction;
  /** When provided, the row becomes an edit button. */
  onSelect?: (transaction: Transaction) => void;
}) {
  const { categoryName, money, date } = useI18n();
  const category = getCategory(transaction.categoryId);
  const sign = transaction.kind === 'income' ? '+' : '−';
  const amountClass =
    transaction.kind === 'income' ? 'tx-row__amount tx-row__amount--income' : 'tx-row__amount';

  const iconClass =
    transaction.kind === 'income' ? 'tx-row__icon tx-row__icon--income' : 'tx-row__icon';

  const body = (
    <>
      <span className={iconClass} aria-hidden="true">
        {category.icon}
      </span>
      <span className="tx-row__details">
        <span className="tx-row__category">{categoryName(transaction.categoryId)}</span>
        {transaction.note ? <span className="tx-row__note">{transaction.note}</span> : null}
      </span>
      <span className="tx-row__meta">
        <span className={amountClass}>
          {sign}
          {money(transaction.amount)}
        </span>
        <span className="tx-row__date">{date(transaction.date)}</span>
      </span>
    </>
  );

  if (onSelect) {
    return (
      <li className="tx-row">
        <button type="button" className="tx-row__button" onClick={() => onSelect(transaction)}>
          {body}
        </button>
      </li>
    );
  }
  return <li className="tx-row tx-row--static">{body}</li>;
}
