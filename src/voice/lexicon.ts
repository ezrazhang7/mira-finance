import type { CategoryId } from '@/domain/types';
import type { Page } from './intents';

export type VoiceLocale = 'en' | 'es';

/**
 * Spoken synonyms, matched against diacritic-stripped lowercase text.
 * Multi-word phrases must be listed before their sub-words would match
 * elsewhere; the parser picks the longest match.
 */
export const CATEGORY_TERMS: Record<VoiceLocale, Record<CategoryId, readonly string[]>> = {
  en: {
    groceries: ['groceries', 'grocery', 'food shopping', 'supermarket', 'food'],
    dining: [
      'dining',
      'restaurant',
      'eating out',
      'takeout',
      'take out',
      'lunch',
      'dinner',
      'coffee',
    ],
    transport: [
      'transport',
      'transportation',
      'bus',
      'train',
      'gas',
      'gasoline',
      'uber',
      'taxi',
      'subway',
    ],
    housing: ['housing', 'rent', 'mortgage'],
    utilities: [
      'utilities',
      'utility',
      'electric',
      'electricity',
      'water bill',
      'internet',
      'phone bill',
    ],
    health: ['health', 'doctor', 'medicine', 'pharmacy', 'dentist'],
    education: ['education', 'school', 'tuition', 'books', 'classes'],
    entertainment: ['entertainment', 'movies', 'games', 'streaming', 'fun'],
    personal: ['personal', 'clothes', 'clothing', 'haircut', 'shoes'],
    family: ['family', 'kids', 'children', 'childcare', 'daycare'],
    savings: ['savings', 'saving'],
    other: ['other', 'something else', 'miscellaneous'],
    salary: ['salary', 'paycheck', 'pay check', 'wages', 'work'],
    gifts: ['gift', 'gifts', 'present'],
    'other-income': ['other income', 'side job', 'side hustle', 'selling'],
  },
  es: {
    groceries: ['despensa', 'mercado', 'supermercado', 'comida', 'mandado'],
    dining: ['restaurante', 'comer fuera', 'almuerzo', 'cena', 'cafe'],
    transport: ['transporte', 'autobus', 'camion', 'tren', 'gasolina', 'uber', 'taxi', 'metro'],
    housing: ['vivienda', 'renta', 'alquiler', 'hipoteca'],
    utilities: ['servicios', 'luz', 'electricidad', 'agua', 'internet', 'telefono'],
    health: ['salud', 'doctor', 'medico', 'medicina', 'farmacia', 'dentista'],
    education: ['educacion', 'escuela', 'colegiatura', 'libros', 'clases'],
    entertainment: ['entretenimiento', 'peliculas', 'cine', 'juegos', 'diversion'],
    personal: ['personal', 'ropa', 'corte de pelo', 'zapatos'],
    family: ['familia', 'ninos', 'hijos', 'guarderia'],
    savings: ['ahorro', 'ahorros'],
    other: ['otro', 'otra cosa', 'varios'],
    salary: ['salario', 'sueldo', 'nomina', 'trabajo', 'quincena'],
    gifts: ['regalo', 'regalos'],
    'other-income': ['otro ingreso', 'trabajo extra', 'venta', 'ventas'],
  },
};

export const PAGE_TERMS: Record<VoiceLocale, Record<Page, readonly string[]>> = {
  en: {
    dashboard: ['dashboard', 'home', 'overview'],
    transactions: ['transactions', 'history', 'spending list'],
    budgets: ['budgets', 'budget page'],
    insights: ['insights', 'reports', 'charts', 'trends'],
    settings: ['settings', 'preferences', 'options'],
  },
  es: {
    dashboard: ['inicio', 'panel', 'resumen'],
    transactions: ['transacciones', 'movimientos', 'historial'],
    budgets: ['presupuestos', 'pagina de presupuestos'],
    insights: ['analisis', 'reportes', 'graficas', 'tendencias'],
    settings: ['ajustes', 'configuracion', 'opciones'],
  },
};

export interface PhrasePatterns {
  help: RegExp;
  navigate: RegExp;
  balance: RegExp;
  spendingQuery: RegExp;
  budget: RegExp;
  income: RegExp;
  expense: RegExp;
  periodToday: RegExp;
  periodLastMonth: RegExp;
  currencyWords: RegExp;
}

/** All patterns run against diacritic-stripped lowercase transcripts. */
export const PATTERNS: Record<VoiceLocale, PhrasePatterns> = {
  en: {
    help: /\b(help|what can (i|you) (say|do))\b/,
    navigate: /\b(go to|open|show( me)?|take me to)\b/,
    balance: /\bbalance\b/,
    spendingQuery:
      /\b(how much (did|have) i (spend|spent)|what (did|have) i (spend|spent)|my spending)\b/,
    budget: /\bbudget\b/,
    income: /\b(got paid|was paid|earned|received|made)\b/,
    expense: /\b(spent|paid|bought|add (an? )?expense)\b/,
    periodToday: /\btoday\b/,
    periodLastMonth: /\blast month\b/,
    currencyWords: /\b(dollars?|bucks?|usd)\b/,
  },
  es: {
    help: /\b(ayuda|que puedo (decir|hacer))\b/,
    navigate: /\b(ve a|ir a|abre|abrir|muestra(me)?|llevame a)\b/,
    balance: /\b(saldo|balance)\b/,
    spendingQuery: /\b(cuanto (he )?gast(e|ado)|que (he )?gast(e|ado)|mis gastos)\b/,
    budget: /\bpresupuesto\b/,
    income: /\b(me pagaron|cobre|gane|recibi|ingreso de)\b/,
    expense: /\b(gaste|pague|compre|agrega(r)? (un )?gasto|anadir (un )?gasto)\b/,
    periodToday: /\bhoy\b/,
    periodLastMonth: /\b(el )?mes pasado\b/,
    currencyWords: /\b(dolares?|pesos?|usd)\b/,
  },
};

/** Lowercases and strips diacritics so "gasté" and "gaste" match alike. */
export function normalizeTranscript(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
