import { currentMonthKey } from '@/domain/dates';
import { monthTotals, totalBalance } from '@/domain/summaries';
import { useAppStore } from '@/store/AppStore';
import { useI18n } from '@/i18n/I18nProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { TransactionRow } from '@/app/components/TransactionRow';
import type { Page } from '@/voice/intents';

const RECENT_COUNT = 5;

export function DashboardPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { transactions } = useAppStore();
  const { t, money, month } = useI18n();

  const monthKey = currentMonthKey();
  const balance = totalBalance(transactions);
  const totals = monthTotals(transactions, monthKey);
  const recent = transactions.slice(0, RECENT_COUNT);

  return (
    <>
      <h1 className="page-title">{t('dashboard.title')}</h1>

      <Card className="balance-card">
        <h2 className="card__title">{t('dashboard.balance')}</h2>
        <p className="balance-card__amount">{money(balance)}</p>
        <p className="balance-card__hint">{t('dashboard.balanceHint')}</p>
      </Card>

      <div className="stat-grid">
        <Card>
          <h2 className="card__title">
            {t('dashboard.spentThisMonth', { month: month(monthKey) })}
          </h2>
          <p className="stat-amount">{money(totals.spent)}</p>
        </Card>
        <Card>
          <h2 className="card__title">
            {t('dashboard.incomeThisMonth', { month: month(monthKey) })}
          </h2>
          <p className="stat-amount stat-amount--income">{money(totals.earned)}</p>
        </Card>
      </div>

      <Card title={t('dashboard.recent')}>
        {recent.length === 0 ? (
          <p className="empty-state">{t('dashboard.empty')}</p>
        ) : (
          <>
            <ul className="tx-list">
              {recent.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </ul>
            <Button variant="ghost" fullWidth onClick={() => onNavigate('transactions')}>
              {t('dashboard.viewAll')}
            </Button>
          </>
        )}
      </Card>
    </>
  );
}
