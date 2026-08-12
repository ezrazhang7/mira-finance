import { currentMonthKey, recentMonthKeys } from '@/domain/dates';
import { monthTotals, spentByCategory } from '@/domain/summaries';
import { useAppStore } from '@/store/AppStore';
import { useI18n } from '@/i18n/I18nProvider';
import { Card } from '@/ui/Card';
import { CategoryBreakdown } from '@/app/components/charts/CategoryBreakdown';
import { MonthlyTrendChart } from '@/app/components/charts/MonthlyTrendChart';

const TREND_MONTHS = 6;

export function InsightsPage() {
  const { transactions } = useAppStore();
  const { t, month, money } = useI18n();

  const monthKey = currentMonthKey();
  const trend = recentMonthKeys(monthKey, TREND_MONTHS).map((key) => ({
    monthKey: key,
    // Compact axis label from the localized month name.
    label: month(key).slice(0, 3),
    fullLabel: month(key),
    amount: monthTotals(transactions, key).spent,
  }));
  const breakdown = spentByCategory(transactions, monthKey);
  const hasExpenses = transactions.some((t) => t.kind === 'expense');

  return (
    <>
      <h1 className="page-title">{t('insights.title')}</h1>

      {!hasExpenses ? (
        <Card>
          <p className="empty-state">{t('insights.noData')}</p>
        </Card>
      ) : (
        <>
          <Card title={t('insights.spendingTrend')}>
            <MonthlyTrendChart
              data={trend.map(({ monthKey: key, label, amount }) => ({
                monthKey: key,
                label,
                amount,
              }))}
            />
            <details className="chart-table">
              <summary>{t('insights.chartTableFallback')}</summary>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t('insights.month')}</th>
                    <th scope="col">{t('insights.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((d) => (
                    <tr key={d.monthKey}>
                      <th scope="row">{d.fullLabel}</th>
                      <td>{money(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </Card>

          {breakdown.length > 0 ? (
            <Card title={t('insights.categoryBreakdown')}>
              <CategoryBreakdown data={breakdown} />
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}
