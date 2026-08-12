import { parseAmountToCents } from '@/domain/money';
import type { Cents } from '@/domain/money';
import { categoriesForKind, fallbackCategory } from '@/domain/categories';
import type { CategoryId, TransactionKind } from '@/domain/types';
import type { Intent, Page, QueryPeriod } from './intents';
import { CATEGORY_TERMS, PAGE_TERMS, PATTERNS, normalizeTranscript } from './lexicon';
import type { VoiceLocale } from './lexicon';
import { isNumberWord, parseNumberWords } from './numberWords';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsPhrase(text: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`).test(text);
}

/**
 * Finds the category whose longest synonym appears in the text.
 * Longest-match-wins keeps "trabajo extra" (other income) from being
 * swallowed by "trabajo" (salary).
 */
function findCategory(
  text: string,
  locale: VoiceLocale,
  kind?: TransactionKind,
): CategoryId | null {
  const candidates = kind
    ? categoriesForKind(kind).map((c) => c.id)
    : (Object.keys(CATEGORY_TERMS[locale]) as CategoryId[]);

  let best: { id: CategoryId; length: number } | null = null;
  for (const id of candidates) {
    for (const term of CATEGORY_TERMS[locale][id]) {
      if (term.length > (best?.length ?? 0) && containsPhrase(text, term)) {
        best = { id, length: term.length };
      }
    }
  }
  return best?.id ?? null;
}

function findPage(text: string, locale: VoiceLocale): Page | null {
  let best: { page: Page; length: number } | null = null;
  for (const [page, terms] of Object.entries(PAGE_TERMS[locale]) as [Page, readonly string[]][]) {
    for (const term of terms) {
      if (term.length > (best?.length ?? 0) && containsPhrase(text, term)) {
        best = { page, length: term.length };
      }
    }
  }
  return best?.page ?? null;
}

const CENTS_CLAUSE: Record<VoiceLocale, RegExp> = {
  en: /\b(?:and|with)\s+([a-z\d ]+?)\s+cents?\b/,
  es: /\b(?:con|y)\s+([a-z\d ]+?)\s+centavos?\b/,
};

function parseCentsPart(phrase: string, locale: VoiceLocale): number | null {
  const trimmed = phrase.trim();
  if (/^\d{1,2}$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  const value = parseNumberWords(trimmed, locale);
  return value !== null && value < 100 ? value : null;
}

/**
 * Extracts a monetary amount from a normalized transcript: digits
 * ("12.50", "$1,200"), spoken numbers ("three hundred fifty"), and
 * spoken cents ("twelve dollars and fifty cents").
 */
export function extractAmountCents(text: string, locale: VoiceLocale): Cents | null {
  let remaining = text;
  let centsPart = 0;

  const centsMatch = CENTS_CLAUSE[locale].exec(remaining);
  if (centsMatch) {
    const parsed = parseCentsPart(centsMatch[1] ?? '', locale);
    if (parsed !== null) {
      centsPart = parsed;
      remaining = remaining.replace(CENTS_CLAUSE[locale], ' ');
    }
  }

  const digitMatch = /(?:\$\s*)?(\d[\d.,]*)/.exec(remaining);
  if (digitMatch) {
    const base = parseAmountToCents(digitMatch[1] ?? '');
    if (base === null) {
      return null;
    }
    // Spoken cents only combine with whole-dollar amounts.
    if (centsPart > 0 && base % 100 === 0) {
      return base + centsPart;
    }
    return base;
  }

  // Longest run of spoken-number words ("three hundred and fifty").
  const words = remaining.split(' ');
  const connectors = locale === 'en' ? ['and'] : ['y'];
  let bestRun: string[] = [];
  let run: string[] = [];
  for (const word of words) {
    if (isNumberWord(word, locale) || (connectors.includes(word) && run.length > 0)) {
      run.push(word);
    } else {
      if (run.length > bestRun.length) {
        bestRun = run;
      }
      run = [];
    }
  }
  if (run.length > bestRun.length) {
    bestRun = run;
  }
  while (bestRun.length > 0 && connectors.includes(bestRun[bestRun.length - 1]!)) {
    bestRun.pop();
  }
  if (bestRun.length === 0) {
    return centsPart > 0 ? centsPart : null;
  }
  const dollars = parseNumberWords(bestRun.join(' '), locale);
  if (dollars === null) {
    return null;
  }
  return dollars * 100 + centsPart;
}

function queryPeriod(text: string, locale: VoiceLocale): QueryPeriod {
  const patterns = PATTERNS[locale];
  if (patterns.periodToday.test(text)) {
    return 'today';
  }
  if (patterns.periodLastMonth.test(text)) {
    return 'last-month';
  }
  return 'this-month';
}

/**
 * Deterministically maps one voice transcript to a typed intent.
 * Unrecognized input always lands on `unknown` — the assistant never
 * guesses at money-changing actions.
 */
export function parseTranscript(raw: string, locale: VoiceLocale): Intent {
  const text = normalizeTranscript(raw);
  if (text === '') {
    return { type: 'unknown', transcript: raw };
  }
  const patterns = PATTERNS[locale];

  if (patterns.help.test(text)) {
    return { type: 'help' };
  }

  if (patterns.navigate.test(text)) {
    const page = findPage(text, locale);
    if (page) {
      return { type: 'navigate', page };
    }
    // No recognizable page: fall through, the phrase may be a query
    // ("show me my spending").
  }

  if (patterns.spendingQuery.test(text)) {
    const categoryId = findCategory(text, locale, 'expense');
    return categoryId
      ? { type: 'query-spending', period: queryPeriod(text, locale), categoryId }
      : { type: 'query-spending', period: queryPeriod(text, locale) };
  }

  if (patterns.balance.test(text)) {
    return { type: 'query-balance' };
  }

  if (patterns.budget.test(text)) {
    const amount = extractAmountCents(text, locale);
    const categoryId = findCategory(text, locale, 'expense');
    if (amount !== null && amount > 0 && categoryId) {
      return { type: 'set-budget', categoryId, amount };
    }
    return { type: 'unknown', transcript: raw };
  }

  if (patterns.income.test(text)) {
    const amount = extractAmountCents(text, locale);
    if (amount !== null && amount > 0) {
      // "I got paid" / "me pagaron" implies wages even without a named
      // category; other income verbs fall back to other-income.
      const paidVerb = locale === 'en' ? /\b(got|was) paid\b/ : /\b(me pagaron|cobre)\b/;
      const categoryId =
        findCategory(text, locale, 'income') ??
        (paidVerb.test(text) ? 'salary' : fallbackCategory('income'));
      return { type: 'add-transaction', kind: 'income', amount, categoryId };
    }
    return { type: 'unknown', transcript: raw };
  }

  if (patterns.expense.test(text)) {
    const amount = extractAmountCents(text, locale);
    if (amount !== null && amount > 0) {
      const categoryId = findCategory(text, locale, 'expense') ?? fallbackCategory('expense');
      return { type: 'add-transaction', kind: 'expense', amount, categoryId };
    }
    return { type: 'unknown', transcript: raw };
  }

  return { type: 'unknown', transcript: raw };
}
