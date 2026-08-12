import { describe, expect, it } from 'vitest';
import { extractAmountCents, parseTranscript } from './parser';

describe('extractAmountCents', () => {
  it.each([
    ['i spent 12.50 on food', 1250],
    ['i spent $12.50 on food', 1250],
    ['i spent 1,200 dollars', 120000],
    ['i spent twenty five dollars', 2500],
    ['three hundred and fifty dollars', 35000],
    ['twelve dollars and fifty cents', 1250],
    ['twelve dollars and 50 cents', 1250],
  ])('en: "%s" -> %d cents', (text, expected) => {
    expect(extractAmountCents(text, 'en')).toBe(expected);
  });

  it.each([
    ['gaste 12,50 en comida', 1250],
    ['gaste veinticinco pesos', 2500],
    ['doce pesos con cincuenta centavos', 1250],
    ['trescientos cincuenta pesos', 35000],
  ])('es: "%s" -> %d cents', (text, expected) => {
    expect(extractAmountCents(text, 'es')).toBe(expected);
  });

  it('returns null when no amount is present', () => {
    expect(extractAmountCents('i spent money on food', 'en')).toBeNull();
    expect(extractAmountCents('gaste en comida', 'es')).toBeNull();
  });
});

describe('parseTranscript (en)', () => {
  it('parses expenses with categories', () => {
    expect(parseTranscript('I spent $12.50 on groceries', 'en')).toEqual({
      type: 'add-transaction',
      kind: 'expense',
      amount: 1250,
      categoryId: 'groceries',
    });
    expect(parseTranscript('I paid 800 for rent', 'en')).toEqual({
      type: 'add-transaction',
      kind: 'expense',
      amount: 80000,
      categoryId: 'housing',
    });
    expect(parseTranscript('I spent twenty five dollars on lunch', 'en')).toEqual({
      type: 'add-transaction',
      kind: 'expense',
      amount: 2500,
      categoryId: 'dining',
    });
  });

  it('falls back to the "other" category for unrecognized nouns', () => {
    expect(parseTranscript('I spent 30 on whatever', 'en')).toEqual({
      type: 'add-transaction',
      kind: 'expense',
      amount: 3000,
      categoryId: 'other',
    });
  });

  it('parses income', () => {
    expect(parseTranscript('I got paid 500 dollars', 'en')).toEqual({
      type: 'add-transaction',
      kind: 'income',
      amount: 50000,
      categoryId: 'salary',
    });
    expect(parseTranscript('I earned 200 from selling', 'en')).toEqual({
      type: 'add-transaction',
      kind: 'income',
      amount: 20000,
      categoryId: 'other-income',
    });
  });

  it('parses spending queries with period and category', () => {
    expect(parseTranscript('How much did I spend this month?', 'en')).toEqual({
      type: 'query-spending',
      period: 'this-month',
    });
    expect(parseTranscript('How much did I spend on groceries last month', 'en')).toEqual({
      type: 'query-spending',
      period: 'last-month',
      categoryId: 'groceries',
    });
    expect(parseTranscript('what did I spend today', 'en')).toEqual({
      type: 'query-spending',
      period: 'today',
    });
    expect(parseTranscript('show me my spending', 'en')).toEqual({
      type: 'query-spending',
      period: 'this-month',
    });
  });

  it('parses balance queries', () => {
    expect(parseTranscript("What's my balance?", 'en')).toEqual({ type: 'query-balance' });
  });

  it('parses budget commands', () => {
    expect(parseTranscript('Set a 300 dollar budget for groceries', 'en')).toEqual({
      type: 'set-budget',
      categoryId: 'groceries',
      amount: 30000,
    });
    expect(parseTranscript('budget three hundred for food', 'en')).toEqual({
      type: 'set-budget',
      categoryId: 'groceries',
      amount: 30000,
    });
  });

  it('refuses budget commands missing amount or category', () => {
    expect(parseTranscript('set a budget', 'en')).toEqual({
      type: 'unknown',
      transcript: 'set a budget',
    });
  });

  it('parses navigation', () => {
    expect(parseTranscript('go to budgets', 'en')).toEqual({ type: 'navigate', page: 'budgets' });
    expect(parseTranscript('open settings', 'en')).toEqual({
      type: 'navigate',
      page: 'settings',
    });
    expect(parseTranscript('show insights', 'en')).toEqual({
      type: 'navigate',
      page: 'insights',
    });
  });

  it('parses help and unknown', () => {
    expect(parseTranscript('help', 'en')).toEqual({ type: 'help' });
    expect(parseTranscript('sing me a song', 'en')).toEqual({
      type: 'unknown',
      transcript: 'sing me a song',
    });
    expect(parseTranscript('   ', 'en')).toEqual({ type: 'unknown', transcript: '   ' });
  });

  it('never treats an amountless expense phrase as a transaction', () => {
    expect(parseTranscript('I spent a lot on food', 'en')).toEqual({
      type: 'unknown',
      transcript: 'I spent a lot on food',
    });
  });
});

describe('parseTranscript (es)', () => {
  it('parses expenses with accents or without', () => {
    expect(parseTranscript('Gasté 12,50 en comida', 'es')).toEqual({
      type: 'add-transaction',
      kind: 'expense',
      amount: 1250,
      categoryId: 'groceries',
    });
    expect(parseTranscript('pague 800 de renta', 'es')).toEqual({
      type: 'add-transaction',
      kind: 'expense',
      amount: 80000,
      categoryId: 'housing',
    });
  });

  it('parses income', () => {
    expect(parseTranscript('Me pagaron 500 pesos', 'es')).toEqual({
      type: 'add-transaction',
      kind: 'income',
      amount: 50000,
      categoryId: 'salary',
    });
  });

  it('parses queries', () => {
    expect(parseTranscript('¿Cuánto gasté este mes?', 'es')).toEqual({
      type: 'query-spending',
      period: 'this-month',
    });
    expect(parseTranscript('cuanto gaste el mes pasado en comida', 'es')).toEqual({
      type: 'query-spending',
      period: 'last-month',
      categoryId: 'groceries',
    });
    expect(parseTranscript('¿Cuál es mi saldo?', 'es')).toEqual({ type: 'query-balance' });
  });

  it('parses budgets and navigation', () => {
    expect(parseTranscript('Pon un presupuesto de 300 para comida', 'es')).toEqual({
      type: 'set-budget',
      categoryId: 'groceries',
      amount: 30000,
    });
    expect(parseTranscript('ve a presupuestos', 'es')).toEqual({
      type: 'navigate',
      page: 'budgets',
    });
    expect(parseTranscript('ayuda', 'es')).toEqual({ type: 'help' });
  });

  it('longest category match wins', () => {
    expect(parseTranscript('recibi 100 de trabajo extra', 'es')).toEqual({
      type: 'add-transaction',
      kind: 'income',
      amount: 10000,
      categoryId: 'other-income',
    });
  });
});
