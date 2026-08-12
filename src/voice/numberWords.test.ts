import { describe, expect, it } from 'vitest';
import { parseNumberWords } from './numberWords';

describe('parseNumberWords (en)', () => {
  it.each([
    ['zero', 0],
    ['five', 5],
    ['twelve', 12],
    ['twenty', 20],
    ['twenty five', 25],
    ['ninety nine', 99],
    ['one hundred', 100],
    ['hundred', 100],
    ['three hundred fifty', 350],
    ['three hundred and fifty', 350],
    ['two thousand', 2000],
    ['twelve thousand five hundred', 12500],
  ])('parses "%s" as %d', (phrase, expected) => {
    expect(parseNumberWords(phrase, 'en')).toBe(expected);
  });

  it('rejects non-numbers', () => {
    expect(parseNumberWords('banana', 'en')).toBeNull();
    expect(parseNumberWords('five banana', 'en')).toBeNull();
    expect(parseNumberWords('', 'en')).toBeNull();
  });
});

describe('parseNumberWords (es)', () => {
  it.each([
    ['cero', 0],
    ['cinco', 5],
    ['doce', 12],
    ['dieciseis', 16],
    ['veinte', 20],
    ['veinticinco', 25],
    ['treinta y cinco', 35],
    ['noventa y nueve', 99],
    ['cien', 100],
    ['ciento cincuenta', 150],
    ['trescientos cincuenta', 350],
    ['quinientos', 500],
    ['dos mil', 2000],
    ['mil doscientos', 1200],
  ])('parses "%s" as %d', (phrase, expected) => {
    expect(parseNumberWords(phrase, 'es')).toBe(expected);
  });

  it('rejects non-numbers', () => {
    expect(parseNumberWords('platano', 'es')).toBeNull();
    expect(parseNumberWords('cinco platanos', 'es')).toBeNull();
  });
});
