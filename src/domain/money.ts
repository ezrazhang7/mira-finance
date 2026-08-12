/**
 * All monetary values in Mira are integer minor units ("cents").
 * Floating-point currency math is forbidden across the codebase.
 */
export type Cents = number;

/** Asserts a value is a safe integer amount of cents. */
export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Monetary amounts must be safe integers of cents, got: ${value}`);
  }
  return value;
}

export function addCents(a: Cents, b: Cents): Cents {
  return cents(a + b);
}

export function subtractCents(a: Cents, b: Cents): Cents {
  return cents(a - b);
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce<Cents>((total, v) => addCents(total, v), 0);
}

/** Formats cents as localized currency, e.g. 123456 -> "$1,234.56". */
export function formatCents(amount: Cents, locale: string, currency = 'USD'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

function digitsOnly(value: string): boolean {
  return /^\d+$/.test(value);
}

/**
 * Parses a human-entered or voice-transcribed amount into cents.
 *
 * Accepts currency symbols, thousands separators, and either "." or ","
 * as the decimal separator (Spanish voice transcripts commonly produce
 * "12,50"). Returns null for anything ambiguous or invalid rather than
 * guessing: money input must never be silently misread.
 *
 * A single separator followed by exactly three digits ("1,234" / "1.234")
 * is read as thousands grouping — currency amounts never have three
 * decimal places.
 */
export function parseAmountToCents(raw: string): Cents | null {
  const cleaned = raw.trim().replace(/[^\d.,-]/g, '');
  if (cleaned === '' || cleaned.includes('-')) {
    return null;
  }

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  let integerDigits: string;
  let fractionDigits: string;

  if (lastDot === -1 && lastComma === -1) {
    integerDigits = cleaned;
    fractionDigits = '';
  } else {
    const sepIndex = Math.max(lastDot, lastComma);
    const decimalSep = cleaned[sepIndex] as '.' | ',';
    const bothPresent = lastDot !== -1 && lastComma !== -1;
    const sepCount = cleaned.split(decimalSep).length - 1;
    const head = cleaned.slice(0, sepIndex);
    const tail = cleaned.slice(sepIndex + 1);

    if (tail.length >= 1 && tail.length <= 2) {
      // Rightmost separator is the decimal point: "12.5", "12,50", "1,234.56".
      integerDigits = head.replace(/[.,]/g, '');
      fractionDigits = tail;
    } else if (tail.length === 3 && !bothPresent) {
      // Grouping only: "1,234", "1.234.567".
      integerDigits = cleaned.replace(/[.,]/g, '');
      fractionDigits = '';
    } else {
      return null;
    }

    // A separator repeated after the decimal position ("1.2.3") or mixed
    // separators with a 3-digit tail ("1,234.567") never survive the
    // branches above; sepCount guards "12,34,56"-style malformed input.
    if (tail.length <= 2 && sepCount > 1 && !bothPresent) {
      return null;
    }
  }

  if (
    (integerDigits !== '' && !digitsOnly(integerDigits)) ||
    (fractionDigits !== '' && !digitsOnly(fractionDigits))
  ) {
    return null;
  }
  if (integerDigits === '' && fractionDigits === '') {
    return null;
  }

  const whole = integerDigits === '' ? 0 : Number.parseInt(integerDigits, 10);
  const fraction = fractionDigits === '' ? 0 : Number.parseInt(fractionDigits.padEnd(2, '0'), 10);

  const total = whole * 100 + fraction;
  return Number.isSafeInteger(total) ? cents(total) : null;
}
