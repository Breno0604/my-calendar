/**
 * @module services/mock
 * Mock events data for development and demo purposes.
 */

/**
 * Creates a date string relative to today.
 * @param {number} offsetDays
 * @returns {string} YYYY-MM-DD
 */
function relativeDate(offsetDays) {
  const d = new Date(Date.now() + offsetDays * 86400000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/**
 * @type {Array<Object>}
 * Mock event data factory. Accepts a relative date function and returns events.
 */
const MOCK_EVENTS_TEMPLATE = [
  {
    id: 1,
    title: 'Revisão do MVP do Calendário',
    description: 'Apresentação das principais visualizações (mês, semana, dia) e filtros de categorias.',
    dateOffset: 0,
    timeStart: '10:00',
    timeEnd: '11:30',
    categoryId: 'trabalho',
    subcategoryId: 'projeto'
  },
  {
    id: 2,
    title: 'Reunião de Alinhamento Semanal',
    description: 'Alinhamento rápido de metas semanais com a equipe e divisão de tarefas.',
    dateOffset: 0,
    timeStart: '14:00',
    timeEnd: '15:00',
    categoryId: 'trabalho',
    subcategoryId: 'reuniao'
  },
  {
    id: 3,
    title: 'Consulta de Rotina - Dentista',
    description: 'Checkup anual na clínica OdontoClean.',
    dateOffset: 1,
    timeStart: '09:00',
    timeEnd: '10:00',
    categoryId: 'pessoal',
    subcategoryId: 'saude'
  },
  {
    id: 4,
    title: 'Entrega do Relatório Financeiro',
    description: 'Enviar o fechamento do caixa e relatórios consolidados para a diretoria.',
    dateOffset: 3,
    timeStart: '08:00',
    timeEnd: '09:30',
    categoryId: 'trabalho',
    subcategoryId: 'projeto'
  },
  {
    id: 5,
    title: 'Sessão de Yoga e Alongamento',
    description: 'Foco em meditação e postura corporal para recarregar as energias.',
    dateOffset: -2,
    timeStart: '17:30',
    timeEnd: '18:30',
    categoryId: 'pessoal',
    subcategoryId: 'lazer'
  },
  {
    id: 6,
    title: 'Jantar de Comemoração',
    description: 'Jantar especial com a família.',
    dateOffset: 5,
    timeStart: '20:00',
    timeEnd: '23:00',
    categoryId: 'pessoal',
    subcategoryId: 'lazer'
  },
  {
    id: 7,
    title: 'Mentoria Técnica de Programação',
    description: 'Dar suporte com dúvidas de arquitetura Vue e estilização responsiva.',
    dateOffset: 2,
    timeStart: '14:00',
    timeEnd: '15:30',
    categoryId: 'trabalho',
    subcategoryId: 'desenvolvimento'
  },
  {
    id: 8,
    title: 'Planejamento de Finanças Pessoais',
    description: 'Ajustar planilha de gastos mensais e investimentos.',
    dateOffset: -1,
    timeStart: '21:00',
    timeEnd: '22:00',
    categoryId: 'pessoal',
    subcategoryId: 'financas'
  }
]

/**
 * Generates mock events with dates relative to the current date.
 * @returns {{ success: boolean, data: Array<Object>, error: string|null }}
 * @example
 * generateMockEvents()
 * // { success: true, data: [{ id: 1, title: 'Revisão...', ... }], error: null }
 */
export function generateMockEvents() {
  try {
    const events = MOCK_EVENTS_TEMPLATE.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: relativeDate(e.dateOffset),
      timeStart: e.timeStart,
      timeEnd: e.timeEnd,
      categoryId: e.categoryId,
      subcategoryId: e.subcategoryId
    }))
    return { success: true, data: events, error: null }
  } catch (err) {
    return { success: false, data: [], error: `generateMockEvents: ${err.message}` }
  }
}
