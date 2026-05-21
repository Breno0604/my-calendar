# Sincronia Calendar — Agent Guide

## Stack
- Vue 3 (`<script setup>` SFCs) + Vite 8, plain CSS (no framework).
- No test runner, no linter, no type checker.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build

## Architecture
- **Single SFC** — `src/App.vue` (~1400 lines) contains all logic + template. Do not create new components unless behavior is truly independent.
- **Global styles** — `src/style.css` (~1670 lines) has design tokens (`:root` / `.dark`), layout, responsive breakpoints, all component styles.
- **Entry** — `src/main.js` mounts `App` into `#app`. Nothing else.
- **Unused file** — `src/components/HelloWorld.vue` is a Vite scaffold leftover; ignore it.
- **Views** — `'month' | 'week' | 'day' | 'list'`, switched via `view` ref.

## Responsive breakpoints (in style.css)
- 1024px — sidebar collapses inline
- 900px — moderate header reduction
- 768px — compact header, search collapses to icon
- 600px — minimal header, weekday abbreviations

## Key conventions
- **Sidebar** — desktop collapse is `width: 0` + `overflow: hidden`; mobile is `transform: translateX(-100%)` drawer. Toggleable at any size.
- **Search** — collapses to icon ≤768px; clicking icon focuses input via `searchInput?.focus()`.
- **FAB** — "Novo Evento" is a fixed FAB (44px, bottom-right), *not* in header.
- **Calendar workspace** — uses `flex-grow: 1` (never `calc()`) to fill remaining height.
- **Month grid** — `grid-template-columns: repeat(7, 1fr)` with `min-width: 0` on day cells to prevent overflow.
- **Dark mode** — toggled via `.dark` class on `<html>` (or root), persisted in LocalStorage.
- **Categories data** — loaded/saved in LocalStorage under key `sincronia_categories`.
- **Portuguese UI** — all labels, placeholders, and user-facing strings in pt-BR.
- **`opencode.json` not present** — `.opencode/` only contains plan files; no tool config.

## File ownership
- `src/App.vue` — all application logic and template
- `src/style.css` — all styles (no scoped `<style>` blocks)
