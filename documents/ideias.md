# Ideias para Futuras Implementações

## Views & Navegação
- **Mini-calendário na sidebar** — calendário clicável para navegação rápida entre meses
- **Drag & drop** — arrastar eventos entre dias no grid mensal/semanal
- **Redimensionar eventos** — arrastar borda inferior no day/week view para alterar horário
- **Eventos de dia inteiro** — checkbox "Dia inteiro" no formulário, exibição especial no grid

## Recorrência
- **Regras complexas (RRULE)** — suporte a `BYDAY` relativo (ex: "terceira quinta do mês"), `BYSETPOS`, `EXDATE`
- **Editar exceção de exceção** — permitir editar uma instância já editada individualmente
- **Visualizar série completa** — botão "Ver todas as ocorrências" que abre lista da série

## UX & Polimento
- **Toast/notificações** — feedback visual ao criar/editar/excluir (em vez de sumir sem confirmação)
- **Undo** — desfazer exclusão via snackbar temporária ("Evento excluído. Desfazer?")
- **Atalhos de teclado** — Navegação com setas, Ctrl+N novo evento, Ctrl+F busca
- **Tooltips aprimorados** — preview do evento ao passar o mouse sobre cápsulas no mês
- **Scroll infinito no mês** — navegar entre meses sem recarregar o grid

## Dados & Persistência
- **Exportar/Importar** — JSON e/ou CSV de eventos e categorias
- **Sincronização cloud** — Google Calendar / Outlook via API
- **Backup automático** — exportar localStorage para arquivo periodicamente
- **Histórico de versões** — snapshot das alterações para recuperação

## Performance
- **Virtual scrolling na agenda** — renderizar apenas eventos visíveis na lista/agenda
- **Lazy expansion** — expandir recorrências apenas para o range visível (já implementado parcialmente)
- **Memoização de filtros** — cache de `filteredEvents` para evitar expansão repetida

## Testes & Qualidade
- **Screenshot tests** — Playwright screenshot para detectar regressão visual
- **Testes coverage** — métricas de cobertura dos testes existentes
- **Testes de acessibilidade** — axe-core ou Lighthouse CI

## Infraestrutura
- **PWA** — service worker para funcionar offline, manifest para instalar como app
- **Dark mode automático** — seguir preferência do sistema sem recarregar
- **Temas customizáveis** — paleta de cores editável pelo usuário
- **i18n** — suporte a múltiplos idiomas (en, es, fr)

## Funcionalidades Avançadas
- **Conflitos de horário** — detectar e alertar eventos sobrepostos
- **Convidados / Compartilhamento** — adicionar participantes a eventos
- **Lembretes** — notificação nativa (Notification API) antes do evento
- **Anexos** — upload de arquivos associados a eventos (base64 no localStorage)
- **Timeline / Gantt** — visualização horizontal de eventos ao longo do dia/semana
- **Modo foco** — ocultar eventos de categorias específicas temporariamente

## UI/UX (Mobile)
- **Swipe para navegar** — deslizar para esquerda/direita para trocar de mês/semana
- **Bottom sheet nativo** — substituir modal por bottom sheet no mobile
- **Haptic feedback** — vibrar ao criar/excluir eventos (dispositivos móveis)

---

*Última atualização: Maio 2026*
