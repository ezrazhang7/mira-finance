/** Local calendar date as ISO `yyyy-mm-dd`. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12) {
    return false;
  }
  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

/** Month key `yyyy-mm` for grouping transactions and budgets. */
export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function currentMonthKey(now: Date = new Date()): string {
  return monthKeyOf(todayISO(now));
}

/** Shifts a `yyyy-mm` month key by a number of months (negative = past). */
export function shiftMonthKey(monthKey: string, offset: number): string {
  const [y, m] = monthKey.split('-').map(Number) as [number, number];
  const date = new Date(y, m - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** The most recent `count` month keys ending at `endKey`, oldest first. */
export function recentMonthKeys(endKey: string, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(shiftMonthKey(endKey, -i));
  }
  return keys;
}
