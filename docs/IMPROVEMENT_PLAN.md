# Mira Finance — Improvement Plan

## Context

The repository currently contains a single-line README describing the product
vision — *"voice first personal finance for underrepresented communities"* —
and no implementation. The gap this plan closes is the distance between that
promise and a working, production-quality application.

## Architecture decisions (constraints derived from the mission)

- **Local-first, no backend.** Financial data never leaves the device
  (IndexedDB). No account, no sign-up, no server to trust. This is a privacy
  posture, not a shortcut: the target users are people with good reasons to
  distrust data collection.
- **Voice as a first-class input, never the only input.** Web Speech API with
  feature detection; every voice flow has an equivalent manual flow. A
  deterministic, unit-tested intent parser turns transcripts into commands —
  no cloud NLP, no API keys.
- **Money is integer minor units (cents).** No floating-point currency math
  anywhere in the codebase.
- **Accessible and bilingual by default.** WCAG-minded components, full
  keyboard operation, screen-reader labels, English + Spanish.
- **Stack:** Vite + React + TypeScript (strict), Vitest + Testing Library.
  Dependencies kept minimal and auditable.

## Checklist

Each item is one commit unless noted. A change not on this list does not
happen without updating this plan first.

### Foundation
- [x] 1. `docs` — Add this improvement plan. *(type: docs)*
- [x] 2. `chore` — Scaffold Vite + React + TypeScript app: strict tsconfig,
  ESLint (flat config + typescript-eslint), Prettier, npm scripts.
  *(type: tooling)*
- [x] 3. `chore` — Test infrastructure: Vitest, Testing Library, jsdom,
  fake-indexeddb, coverage config. *(type: tooling)*

### Core domain (pure TypeScript, fully unit-tested)
- [x] 4. `backend` — Money and domain model: integer-cent `Money` utilities,
  `Transaction`, `Category`, `Budget` types, category taxonomy, validation.
  *(type: architecture)*
- [x] 5. `backend` — Persistence layer: typed IndexedDB wrapper with schema
  versioning and migration path; tested against fake-indexeddb.
  *(type: architecture)*
- [x] 6. `backend` — Application store: React context + reducer over the
  persistence layer; optimistic updates; undoable deletes. *(type: architecture)*
- [ ] 7. `backend` — Voice intent parser: deterministic grammar mapping
  transcripts ("I spent 12 dollars on groceries", "how much did I spend this
  month", "set a 300 dollar budget for food") to typed intents, in English and
  Spanish. *(type: feature)*
- [ ] 8. `backend` — Speech services: SpeechRecognition + SpeechSynthesis
  wrappers with capability detection, error taxonomy, and graceful
  degradation to text input. *(type: API integration)*

### Interface
- [ ] 9. `ui` — Design system: CSS custom-property tokens (light/dark),
  accessible primitives (Button, Card, Field, Select, Dialog, Toast).
  *(type: UI)*
- [ ] 10. `ui` — App shell: routing, landmark structure, skip link, bottom
  navigation, responsive layout. *(type: UI)*
- [ ] 11. `ui` — Dashboard: balance summary, month-to-date spend, recent
  transactions. *(type: UI)*
- [ ] 12. `ui` — Transactions: entry form with validation, list with
  filtering, edit/delete with undo. *(type: UI)*
- [ ] 13. `ui` — Voice assistant: push-to-talk control, live transcript,
  spoken + visual confirmation, full manual fallback. *(type: UI/feature)*
- [ ] 14. `ui` — Budgets: create/edit monthly budgets per category, progress
  meters with over-budget states. *(type: UI)*
- [ ] 15. `ui` — Insights: monthly spending trend and category breakdown as
  accessible SVG charts with data-table fallbacks. *(type: UI)*

### Cross-cutting
- [ ] 16. `backend` — i18n: typed translation layer, English + Spanish
  locales, locale-aware currency/date formatting via `Intl`. *(type: i18n)*
- [ ] 17. `security` — Hardening pass: Content-Security-Policy, input
  validation review, no-`dangerouslySetInnerHTML` audit, dependency audit,
  export/erase-my-data controls. *(type: security audit)*
- [ ] 18. `chore` — PWA: web manifest, icons, installability, offline shell.
  *(type: platform)*
- [ ] 19. `docs` — README overhaul: what/why/how, architecture overview,
  screenshots section, development guide. *(type: docs)*

## Explicitly out of scope (deliberate)

- Bank account aggregation (Plaid etc.) — requires credentials and a backend;
  contradicts the local-first privacy posture chosen above.
- Cloud sync / multi-device — same reason.
- CI/CD workflows — per task guardrails, no CI/CD configuration is touched.
- Native mobile builds — the PWA covers install-to-home-screen.
