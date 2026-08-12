import { describe, expect, it } from 'vitest';
import {
  currentMonthKey,
  isISODate,
  monthKeyOf,
  recentMonthKeys,
  shiftMonthKey,
  todayISO,
} from './dates';

describe('todayISO / monthKeyOf', () => {
  it('formats local dates with zero padding', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(monthKeyOf('2026-01-05')).toBe('2026-01');
    expect(currentMonthKey(new Date(2026, 11, 31))).toBe('2026-12');
  });
});

describe('isISODate', () => {
  it('accepts valid calendar dates', () => {
    expect(isISODate('2026-08-12')).toBe(true);
    expect(isISODate('2024-02-29')).toBe(true);
  });

  it('rejects malformed or impossible dates', () => {
    expect(isISODate('2026-13-01')).toBe(false);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2025-02-29')).toBe(false);
    expect(isISODate('08/12/2026')).toBe(false);
    expect(isISODate('2026-8-12')).toBe(false);
  });
});

describe('shiftMonthKey / recentMonthKeys', () => {
  it('shifts across year boundaries', () => {
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
    expect(shiftMonthKey('2026-06', 0)).toBe('2026-06');
  });

  it('lists recent months oldest first', () => {
    expect(recentMonthKeys('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});
