import { getCategory } from '@/domain/categories';
import type { Cents } from '@/domain/money';
import type { CategoryId } from '@/domain/types';
import { useI18n } from '@/i18n/I18nProvider';

export interface CategoryDatum {
  categoryId: CategoryId;
  amount: Cents;
}

/**
 * Ranked horizontal bar list of this month's spending per category.
 * Identity is carried by icon + name labels (never color alone); every
 * bar is direct-labeled with its value, so no tooltip layer is needed.
 */
export function CategoryBreakdown({ data }: { data: CategoryDatum[] }) {
  const { categoryName, money } = useI18n();
  const max = Math.max(...data.map((d) => d.amount));

  return (
    <ul className="bar-list">
      {data.map((d) => {
        const fraction = max === 0 ? 0 : d.amount / max;
        return (
          <li key={d.categoryId} className="bar-list__row">
            <span className="bar-list__label">
              <span aria-hidden="true">{getCategory(d.categoryId).icon}</span>{' '}
              {categoryName(d.categoryId)}
            </span>
            <span className="bar-list__track">
              <span
                className="bar-list__fill"
                style={{ width: `${Math.max(2, fraction * 100)}%` }}
                aria-hidden="true"
              />
            </span>
            <span className="bar-list__value">{money(d.amount)}</span>
          </li>
        );
      })}
    </ul>
  );
}
