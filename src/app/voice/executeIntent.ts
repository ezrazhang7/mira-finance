import { todayISO } from '@/domain/dates';
import { spentInPeriod, totalBalance } from '@/domain/summaries';
import type { Transaction } from '@/domain/types';
import type { DraftBudget, DraftTransaction } from '@/domain/validation';
import type { WriteResult } from '@/store/AppStore';
import type { I18n } from '@/i18n/I18nProvider';
import type { Intent, Page, QueryPeriod } from '@/voice/intents';

/** The slice of the app store an intent execution may touch. */
export interface IntentContext {
  transactions: readonly Transaction[];
  addTransaction: (draft: DraftTransaction) => Promise<WriteResult>;
  saveBudget: (draft: DraftBudget) => Promise<WriteResult>;
  navigate: (page: Page) => void;
  i18n: I18n;
}

function periodPhrase(period: QueryPeriod, i18n: I18n): string {
  switch (period) {
    case 'today':
      return i18n.t('voiceReply.periodToday');
    case 'last-month':
      return i18n.t('voiceReply.periodLastMonth');
    case 'this-month':
      return i18n.t('voiceReply.periodThisMonth');
  }
}

/**
 * Executes a parsed intent and returns the reply to show and speak.
 * Every branch produces a definite, localized sentence — the assistant
 * always tells the user exactly what happened.
 */
export async function executeIntent(intent: Intent, ctx: IntentContext): Promise<string> {
  const { i18n } = ctx;

  switch (intent.type) {
    case 'add-transaction': {
      const draft: DraftTransaction = {
        kind: intent.kind,
        amount: intent.amount,
        categoryId: intent.categoryId,
        note: '',
        date: todayISO(),
      };
      const result = await ctx.addTransaction(draft);
      if (!result.ok) {
        return i18n.t('voiceReply.saveFailed');
      }
      const params = {
        amount: i18n.money(intent.amount),
        category: i18n.categoryName(intent.categoryId),
      };
      return intent.kind === 'expense'
        ? i18n.t('voiceReply.addedExpense', params)
        : i18n.t('voiceReply.addedIncome', params);
    }

    case 'query-spending': {
      const total = spentInPeriod(ctx.transactions, intent.period, intent.categoryId);
      const period = periodPhrase(intent.period, i18n);
      return intent.categoryId
        ? i18n.t('voiceReply.spendingTotalCategory', {
            amount: i18n.money(total),
            category: i18n.categoryName(intent.categoryId),
            period,
          })
        : i18n.t('voiceReply.spendingTotal', { amount: i18n.money(total), period });
    }

    case 'query-balance':
      return i18n.t('voiceReply.balance', { amount: i18n.money(totalBalance(ctx.transactions)) });

    case 'set-budget': {
      const result = await ctx.saveBudget({
        categoryId: intent.categoryId,
        monthlyLimit: intent.amount,
      });
      if (!result.ok) {
        return i18n.t('voiceReply.saveFailed');
      }
      return i18n.t('voiceReply.budgetSet', {
        category: i18n.categoryName(intent.categoryId),
        amount: i18n.money(intent.amount),
      });
    }

    case 'navigate':
      ctx.navigate(intent.page);
      return i18n.t('voiceReply.navigating', { page: i18n.t(`nav.${intent.page}`) });

    case 'help':
      return [
        i18n.t('voice.exampleSpend'),
        i18n.t('voice.exampleIncome'),
        i18n.t('voice.exampleQuery'),
        i18n.t('voice.exampleBudget'),
        i18n.t('voice.exampleNavigate'),
      ].join(' ');

    case 'unknown':
      return i18n.t('voiceReply.unknown');
  }
}
