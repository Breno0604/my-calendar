# Sincronia Calendar — Agent Guide

## Stack
- Vue 3 (`<script setup>` SFCs) + Vite 8, plain CSS (no framework).
- **No linter, no type checker** — only test gate is Playwright.
- Test framework: **Playwright** (chromium, headless, 2 workers).
- Playwright auto-starts dev server on port 5173; no manual setup.
- Dependency: `xlsx` for XLSX export (lazy-imported on demand).
- Unused Vite scaffold leftover: `src/components/HelloWorld.vue` — ignore it.
- `dist/`, `test-results/`, `playwright-report/` are gitignored.
- Repo doc files in `documents/` (`ideias.md`, `nova_branch.md`).

## Commands
- `npm run dev` — dev server at http://localhost:5173
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build
- `npm test` — runs Playwright test suite (63 tests, 8 spec files)
- **No single-test shortcut** — use `npm test -- tests/events.spec.js` for a focused file.
- **No required command order** — no lint/typecheck step exists.

## Architecture

### Two-layer design
- **`src/App.vue`** (~1982 lines) — all UI logic, template, modal state, drag/resize handlers, Vue refs/computeds (no scoped styles). UI-only functions (modal open/close, drag state) stay in App.vue.
- **`src/services/`** (6 pure modules) — business logic with contract pattern `{ success, data, error }`. Every function has JSDoc (`@param`, `@returns`, `@example`). I/O wrapped in `try/catch`.

### Service modules
| File | Role |
|---|---|
| `date.js` | Formatting & parsing (6 fns) |
| `calendar.js` | Month/week/mini grid cell builders (8 fns) |
| `recurrence.js` | Recurrence expansion, CRUD for series/instances (13 fns) |
| `event-utils.js` | Filter, group, detect conflicts, category lookups (13 fns) |
| `mock.js` | Mock event generator (2 fns) |
| `io.js` | localStorage, CSV/XLSX, notification, resize math (11 fns) |

### How App.vue calls services
- Imports: `import * as calService from './services/calendar.js'` (one namespace per module).
- Wrappers in App.vue call the service, check `result.success`, use `result.data` or fallback.
- Computed properties that need a plain value: `return result.success ? result.data : []`.
- Vue computeds (`filteredEvents`, `groupedEvents`, `weekDays`, `miniCalendarDays`) delegate to services.
- Exceptions: `toggleTheme` is pure DOM/refs inline; `getCategoryColor`, `getCategoryName`, `getSubcategoryName` wrappers exist in App.vue for template access.

### App.vue layout (template ~950 lines)
- Entry: `src/main.js` → `createApp(App).mount('#app')`.
- Views: `'month' | 'week' | 'day' | 'list'`, switched via `view` ref.
- **Do not create new `.vue` components** — keep all in single SFC.
- **Global styles only** — `src/style.css` (~2102 lines) has design tokens (`:root` / `.dark`), layout, responsive breakpoints, all component styles. No scoped `<style>` blocks.

## Responsive breakpoints (in style.css)
- 1024px — sidebar collapses inline
- 900px — moderate header reduction
- 768px — compact header, search collapses to icon
- 600px — minimal header, weekday abbreviations

## Key conventions
- **Portuguese UI** — all labels, placeholders, and user-facing strings in pt-BR.
- **Dark mode** — toggled via `.dark` class on `<html>`, persisted in LocalStorage under key `theme`.
- **Sidebar** — desktop collapse is `width: 0` + `overflow: hidden`; mobile is `transform: translateX(-100%)` drawer. Toggleable at any size.
- **Search** — collapses to icon ≤768px; clicking icon focuses input via `searchInput?.focus()`.
- **FAB** — "Novo Evento" is a fixed FAB (44px, bottom-right), *not* in header.
- **Calendar workspace** — uses `flex-grow: 1` (never `calc()`) to fill remaining height.
- **Month grid** — `grid-template-columns: repeat(7, 1fr)` with `min-width: 0` on day cells to prevent overflow.
- **Categories** — loaded/saved in LocalStorage under key `sincronia_categories`.
- **Events** — loaded/saved in LocalStorage under key `sincronia_events`.

## Testing
- 63 tests across 9 spec files in `tests/`.
- Test helpers in `tests/helpers.js`: `seedStorage(page, opts)` pre-populates localStorage for deterministic test state.
- Default seeded categories: `pessoal` (#10b981) and `trabalho` (#3b82f6), each with 3 subcategories.
- Common fixture pattern: `seedStorage(page, { events, categories, theme, fixedDate })` in `page.addInitScript`.
- Tests are **not parallelized** (`fullyParallel: false`), 2 workers.
- Timeout per test: 15s. Dev server startup is automatic via `webServer` config.

## Relevant config files
- `vite.config.js` — minimal: just `@vitejs/plugin-vue`.
- `playwright.config.js` — chromium only, `baseURL: http://localhost:5173`.
- `.vscode/extensions.json` — Vue + Playwright extensions recommended.
- `ui_ux.md` — design notes (not authoritative, for reference).
