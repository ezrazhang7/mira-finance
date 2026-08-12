import { describe, expect, it } from 'vitest';
import { addCents, cents, formatCents, parseAmountToCents, subtractCents, sumCents } from './money';

describe('cents', () => {
  it('accepts safe integers', () => {
    expect(cents(0)).toBe(0);
    expect(cents(123456)).toBe(123456);
    expect(cents(-500)).toBe(-500);
  });

  it('rejects non-integers and unsafe values', () => {
    expect(() => cents(1.5)).toThrow(RangeError);
    expect(() => cents(Number.NaN)).toThrow(RangeError);
    expect(() => cents(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});

describe('arithmetic', () => {
  it('adds, subtracts, and sums', () => {
    expect(addCents(1050, 250)).toBe(1300);
    expect(subtractCents(1050, 250)).toBe(800);
    expect(sumCents([100, 200, 300])).toBe(600);
    expect(sumCents([])).toBe(0);
  });
});

describe('formatCents', () => {
  it('formats US dollars in English', () => {
    expect(formatCents(123456, 'en-US')).toBe('$1,234.56');
  });

  it('formats in Spanish locales', () => {
    // Symbol and separators vary by ICU build; assert the digits survive.
    const formatted = formatCents(123456, 'es-MX');
    expect(formatted).toMatch(/1[.,]?234[.,]56/);
  });
});

describe('parseAmountToCents', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['$12.50', 1250],
    ['  $ 12.50 ', 1250],
    ['0.99', 99],
    ['.50', 50],
    ['1,234.56', 123456],
    ['1,234', 123400],
    ['1.234', 123400],
    ['1,234,567', 123456700],
    ['1.234.567', 123456700],
    ['12.345', 1234500],
    ['12,50', 1250],
    ['1.234,56', 123456],
    ['0', 0],
  ])('parses %s as %d cents', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected);
  });

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['-5'],
    ['1,2345'],
    ['1,234.567'],
    ['12,34,56'],
    ['1.2.3'],
    ['12.'],
  ])('rejects %s', (input) => {
    expect(parseAmountToCents(input)).toBeNull();
  });

  it('rejects amounts that overflow safe integers', () => {
    expect(parseAmountToCents('9'.repeat(20))).toBeNull();
  });
});
