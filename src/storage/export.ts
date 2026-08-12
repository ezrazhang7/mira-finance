import type { Budget, Settings, Transaction } from '@/domain/types';

export interface ExportPayload {
  app: 'mira-finance';
  formatVersion: 1;
  exportedAt: string;
  transactions: Transaction[];
  budgets: Budget[];
  settings: Settings;
}

/**
 * Serializes the user's complete dataset for the "download my data"
 * control. Everything the app stores is included — there is nothing
 * else, anywhere, by design.
 */
export function buildExportPayload(
  transactions: readonly Transaction[],
  budgets: readonly Budget[],
  settings: Settings,
  now: Date = new Date(),
): string {
  const payload: ExportPayload = {
    app: 'mira-finance',
    formatVersion: 1,
    exportedAt: now.toISOString(),
    transactions: [...transactions],
    budgets: [...budgets],
    settings,
  };
  return JSON.stringify(payload, null, 2);
}

/** Triggers a client-side file download; no network involved. */
export function downloadJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
