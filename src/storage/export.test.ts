import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/domain/types';
import type { Transaction } from '@/domain/types';
import { isTransaction } from '@/domain/validation';
import { buildExportPayload } from './export';

const tx: Transaction = {
  id: 't1',
  kind: 'expense',
  amount: 1250,
  categoryId: 'groceries',
  note: 'weekly shop',
  date: '2026-08-10',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

describe('buildExportPayload', () => {
  it('produces versioned, re-importable JSON of the full dataset', () => {
    const now = new Date('2026-08-12T12:00:00.000Z');
    const json = buildExportPayload([tx], [], DEFAULT_SETTINGS, now);
    const parsed = JSON.parse(json);

    expect(parsed.app).toBe('mira-finance');
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.exportedAt).toBe('2026-08-12T12:00:00.000Z');
    expect(parsed.transactions).toHaveLength(1);
    expect(isTransaction(parsed.transactions[0])).toBe(true);
    expect(parsed.settings).toEqual(DEFAULT_SETTINGS);
  });
});
