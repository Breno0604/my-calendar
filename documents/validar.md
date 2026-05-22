# Plano de Validações — Sincronia Calendar

## Resumo

Análise completa de todos os campos de formulário no `App.vue`. Existem ~20 campos únicos em 3 modais (add/edit event + settings/categories). Atualmente a única validação JS forte é **título não vazio**. O resto depende de `required` HTML (burlável) ou não tem validação alguma.

---

## Prioridade Alta — Corrompe dados

| # | Campo(s) | Local | Problema | Validação |
|---|----------|-------|----------|-----------|
| 1 | `timeEnd` | add/edit event | Pode ser anterior a `timeStart` (ex: 14:00→13:00). Salva horário inválido. | `timeEnd > timeStart` — bloquear save com toast `'Horário final deve ser após o inicial'` |
| 2 | `date` | add/edit event | Só tem `required` HTML. JS não verifica. Se o browser não validar (ou autocomplete preencher errado), evento sem data é salvo. | JS guard `if (!eventForm.value.date) { addToast('Selecione uma data', 'error'); return }` |
| 3 | `timeStart`, `timeEnd` | add/edit event | Mesmo problema do date — só `required` HTML. | JS guard `if (!eventForm.value.timeStart || !eventForm.value.timeEnd) { addToast('Preencha os horários', 'error'); return }` |

### Arquivos afetados

- `src/App.vue` — funções `saveNewEvent()` (linha ~587) e `saveEditedEvent()` (linha ~605)

---

## Prioridade Média — Dados inconsistentes

| # | Campo(s) | Local | Problema | Validação |
|---|----------|-------|----------|-----------|
| 4 | `byDay` (chips semanais) | add/edit event, `freq === 'weekly'` | Nenhum dia selecionado → `expandRecurrences` gera 0 instâncias. Evento "vazio". | Se `freq === 'weekly'` e `byDay.length === 0`, bloquear com toast `'Selecione ao menos um dia da semana'` |
| 5 | `endCount` | add/edit event, `endType === 'count'` | Pode estar vazio ou 0. | `if (endType === 'count' && (!endCount || endCount < 1)) { ... }` |
| 6 | `endDate` | add/edit event, `endType === 'date'` | Pode ser anterior à data do evento. | `if (endType === 'date' && endDate <= eventForm.date) { ... }` |
| 7 | Nome de categoria | settings | Duplicata permitida — duas categorias com mesmo nome. | `if (categoriesData.value.some(c => c.name.toLowerCase() === name.toLowerCase())) { addToast('Já existe uma categoria com este nome', 'error'); return }` |
| 8 | Nome de subcategoria | settings | Duplicata dentro da mesma categoria. | `if (cat.subcategories.some(s => s.name.toLowerCase() === name.toLowerCase())) { addToast('Já existe esta subcategoria', 'error'); return }` |

### Arquivos afetados

- `src/App.vue` — `saveNewEvent()`, `saveEditedEvent()`, `addCategory()` (linha ~746), `addSubcategory()` (linha ~793), `saveEditCategory()` (linha ~844), `saveEditSubcategory()` (linha ~859)

---

## Prioridade Baixa — UX

| # | Botão | Local | Problema | Correção |
|---|-------|-------|----------|----------|
| 9 | "+ Add" subcategoria | settings | Sem `:disabled` — função retorna silenciosamente se vazio. | `:disabled="!newSubcategoryNames[cat.id]?.trim()"` |
| 10 | "Ok" editar categoria | settings | Sem `:disabled`. | `:disabled="!editingCategoryName.trim()"` |
| 11 | "Ok" editar subcategoria | settings | Sem `:disabled`. | `:disabled="!editingSubcategoryName.trim()"` |

### Arquivos afetados

- `src/App.vue` — template, linhas ~2063, ~2106, ~2129

---

## Não mudar (decisão consciente)

| Item | Motivo |
|------|--------|
| Conflito de horário (sobreposição) | Mantido como aviso não-bloqueante. Usuário pode querer eventos sobrepostos. |
| Título vazio | Já validado (`:disabled` + JS guard). OK. |
| Campos de recorrência não aplicáveis | `buildRecurrence()` em `recurrence.js` lida com defaults. |
| Campos de filtro/busca | Não são formulários de dados. |

---

## Implementação

### 1. App.vue — `saveNewEvent()` (alta prioridade)

Seguir o padrão existente de `if (!x) return` com `addToast`:

```js
const saveNewEvent = () => {
  if (!eventForm.value.title.trim()) return
  if (!eventForm.value.date) { addToast('Selecione uma data', 'error'); return }
  if (!eventForm.value.timeStart || !eventForm.value.timeEnd) { addToast('Preencha os horários', 'error'); return }
  if (eventForm.value.timeEnd <= eventForm.value.timeStart) { addToast('Horário final deve ser após o inicial', 'error'); return }
  // validações de recorrência (média prioridade)
  if (recurForm.value.freq === 'weekly' && (!recurForm.value.byDay || recurForm.value.byDay.length === 0)) {
    addToast('Selecione ao menos um dia da semana', 'error'); return
  }
  if (recurForm.value.endType === 'count' && (!recurForm.value.endCount || recurForm.value.endCount < 1)) {
    addToast('Número de ocorrências inválido', 'error'); return
  }
  if (recurForm.value.endType === 'date' && recurForm.value.endDate && recurForm.value.endDate <= eventForm.value.date) {
    addToast('Data de término deve ser após a data do evento', 'error'); return
  }
  // ... existing logic
}
```

### 2. App.vue — `saveEditedEvent()` (alta prioridade)

Mesmas validações de `saveNewEvent()` aplicadas antes da lógica de edição.

### 3. App.vue — Validações de categoria (média prioridade)

Em `addCategory()`:

```js
if (categoriesData.value.some(c => c.name.toLowerCase() === name.toLowerCase())) {
  addToast('Já existe uma categoria com este nome', 'error'); return
}
```

Em `addSubcategory()`:

```js
if (cat.subcategories.some(s => s.name.toLowerCase() === name.toLowerCase())) {
  addToast('Já existe esta subcategoria', 'error'); return
}
```

### 4. Testes (opcional)

Criar `tests/validation.spec.js` com 3-4 testes:

- V1: criar evento com `timeEnd < timeStart` → modal não fecha, toast aparece
- V2: criar evento sem data → modal não fecha
- V3: criar categoria duplicada → toast de erro
- V4: criar evento weekly sem dias → modal não fecha
