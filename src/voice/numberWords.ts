import type { VoiceLocale } from './lexicon';

/**
 * Parses spoken cardinal numbers ("three hundred fifty", "trescientos
 * cincuenta") into integers. Speech recognizers usually emit digits for
 * amounts, but not always — especially for round numbers.
 *
 * Input must already be normalized (lowercase, diacritics stripped).
 * Supports 0–999,999. Returns null when the words do not form a number.
 */
const EN_UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const EN_TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const ES_UNITS: Record<string, number> = {
  cero: 0,
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintiun: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
};

const ES_TENS: Record<string, number> = {
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
};

const ES_HUNDREDS: Record<string, number> = {
  cien: 100,
  ciento: 100,
  doscientos: 200,
  trescientos: 300,
  cuatrocientos: 400,
  quinientos: 500,
  seiscientos: 600,
  setecientos: 700,
  ochocientos: 800,
  novecientos: 900,
};

function parseEnglish(words: readonly string[]): number | null {
  let total = 0;
  let current = 0;
  let consumedAny = false;

  for (const word of words) {
    if (word === 'and') {
      continue;
    }
    if (word in EN_UNITS) {
      current += EN_UNITS[word]!;
    } else if (word in EN_TENS) {
      current += EN_TENS[word]!;
    } else if (word === 'hundred') {
      current = (current === 0 ? 1 : current) * 100;
    } else if (word === 'thousand') {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else {
      return null;
    }
    consumedAny = true;
  }
  return consumedAny ? total + current : null;
}

function parseSpanish(words: readonly string[]): number | null {
  let total = 0;
  let current = 0;
  let consumedAny = false;

  for (const word of words) {
    if (word === 'y') {
      continue;
    }
    if (word in ES_HUNDREDS) {
      current += ES_HUNDREDS[word]!;
    } else if (word in ES_TENS) {
      current += ES_TENS[word]!;
    } else if (word in ES_UNITS) {
      current += ES_UNITS[word]!;
    } else if (word === 'mil') {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else {
      return null;
    }
    consumedAny = true;
  }
  return consumedAny ? total + current : null;
}

export function parseNumberWords(phrase: string, locale: VoiceLocale): number | null {
  const words = phrase.split(' ').filter((w) => w.length > 0);
  if (words.length === 0) {
    return null;
  }
  const value = locale === 'en' ? parseEnglish(words) : parseSpanish(words);
  if (value === null || value > 999_999) {
    return null;
  }
  return value;
}

/** Word lists used to locate a number phrase inside a longer sentence. */
export function isNumberWord(word: string, locale: VoiceLocale): boolean {
  if (locale === 'en') {
    return word in EN_UNITS || word in EN_TENS || word === 'hundred' || word === 'thousand';
  }
  return word in ES_UNITS || word in ES_TENS || word in ES_HUNDREDS || word === 'mil';
}
