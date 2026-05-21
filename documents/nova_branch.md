# Branch: `refactor/clean-architecture`

## Propósito
Refatorar a arquitetura do `src/App.vue` para seguir 6 regras de clean architecture:
1. Atomização extrema (funções ≤ 50 linhas, SRP)
2. Contratos de interface (`{ success, data, error }`)
3. Injeção de dependência (sem globais)
4. Tratamento de erros (`try/catch`)
5. JSDoc completo (`@param`, `@returns`, `@example`)
6. Verificação sistemática

## Fases

| Fase | Status | Descrição |
|------|--------|-----------|
| **F1** | ✅ Feito | Criar `src/services/*.js` (6 módulos, ~30 funções puras) |
| **F2** | ❌ Pendente | Atomizar funções grandes nos serviços |
| **F3** | ❌ Pendente | Adaptar `App.vue` — wrappers com DI + contrato |

### F1 — Módulos criados

| Módulo | Funções | Descrição |
|--------|---------|-----------|
| `src/services/date.js` | 6 | Formatação de datas (`formatMonthYear`, `toDateString`, `parseDate`, etc.) |
| `src/services/recurrence.js` | 4 | Cálculo de recorrências (`getNextRecurDate`, `expandRecurrences`, `buildRecurrence`) |
| `src/services/calendar.js` | 7 | Geração de grids (`buildMonthCells`, `buildWeekDays`, `initInfiniteScrollData`, etc.) |
| `src/services/event-utils.js` | 12 | Filtros, agrupamento, conflitos, estilos (`filterEvents`, `detectConflicts`, `getEventStyle`, etc.) |
| `src/services/mock.js` | 1 | Dados mock (`generateMockEvents` com template separado) |
| `src/services/io.js` | 9 | I/O e plataforma (`saveToStorage`, `generateCSV`, `parseCSV`, `downloadBlob`, etc.) |

**Total:** ~950 linhas de serviços puros.

## Como alternar entre branches

```bash
# Voltar para main (versão estável atual)
git checkout main

# Voltar para a branch de refatoração
git checkout refactor/clean-architecture

# Ver diferença entre as branches
git diff main..refactor/clean-architecture --stat
```

## Quando fazer o merge

**Merge apenas quando TODAS as fases (F1, F2, F3) estiverem completas e os 63 testes passarem.**

```bash
# Na main:
git merge refactor/clean-architecture --no-ff
```

### Critérios de aceite para merge:
- [ ] F1: 6 módulos de serviço criados e importáveis
- [ ] F2: Nenhuma função em App.vue > 50 linhas
- [ ] F3: Toda função pura movida para serviços; App.vue só tem wrappers
- [ ] Todos os `localStorage`, `window`, `document` são injetados como parâmetros
- [ ] Toda função retorna `{ success, data, error }`
- [ ] Toda função tem JSDoc (`@param`, `@returns`, `@example`)
- [ ] `npm run test` — 63/63 passando
- [ ] `npm run build` — sem erros

## Rollback

Se algo quebrar após o merge:

```bash
# Reverter o merge commit
git revert -m 1 <merge-commit-hash>

# Ou resetar para antes do merge
git reset --hard HEAD~1
```

Enquanto a branch existir, você pode testar à vontade sem contaminar `main`.

## Notas

- O template HTML de `App.vue` **não é modificado** em nenhuma fase — zero mudanças em `v-for`, `v-on`, `{{ }}`, etc.
- Os 63 testes Playwright existentes continuam válidos pois a interface DOM não muda.
- `src/style.css` não é tocado.
