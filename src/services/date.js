/**
 * @module services/date
 * Pure date formatting and parsing functions.
 * Todas as funções retornam { success, data, error } conforme contrato de interface.
 */

/**
 * @param {Date} date
 * @returns {{ success: boolean, data: string, error: string|null }}
 * @example
 * formatMonthYear(new Date('2026-05-21'))
 * // { success: true, data: 'Maio 2026', error: null }
 */
export function formatMonthYear(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return { success: false, data: '', error: 'date deve ser uma Date válida' }
  }
  try {
    const r = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return { success: true, data: r.charAt(0).toUpperCase() + r.slice(1), error: null }
  } catch (err) {
    return { success: false, data: '', error: `formatMonthYear: ${err.message}` }
  }
}

/**
 * @param {Date} date
 * @returns {{ success: boolean, data: string, error: string|null }}
 * @example
 * formatDateShort(new Date('2026-05-21'))
 * // { success: true, data: '21 de mai.', error: null }
 */
export function formatDateShort(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return { success: false, data: '', error: 'date deve ser uma Date válida' }
  }
  try {
    const r = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    return { success: true, data: r, error: null }
  } catch (err) {
    return { success: false, data: '', error: `formatDateShort: ${err.message}` }
  }
}

/**
 * @param {Date} date
 * @returns {{ success: boolean, data: string, error: string|null }}
 * @example
 * formatDateFull(new Date('2026-05-21'))
 * // { success: true, data: 'Quinta-feira, 21 de maio de 2026', error: null }
 */
export function formatDateFull(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return { success: false, data: '', error: 'date deve ser uma Date válida' }
  }
  try {
    const r = date.toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    return { success: true, data: r.charAt(0).toUpperCase() + r.slice(1), error: null }
  } catch (err) {
    return { success: false, data: '', error: `formatDateFull: ${err.message}` }
  }
}

/**
 * @param {number} dayIndex - 0=Dom, 1=Seg, ..., 6=Sáb
 * @returns {{ success: boolean, data: string, error: string|null }}
 * @example
 * getWeekDayName(0) // { success: true, data: 'Dom', error: null }
 */
export function getWeekDayName(dayIndex) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  if (typeof dayIndex !== 'number' || dayIndex < 0 || dayIndex > 6) {
    return { success: false, data: '', error: 'dayIndex deve ser número entre 0 e 6' }
  }
  return { success: true, data: days[dayIndex], error: null }
}

/**
 * @param {Date} date
 * @returns {{ success: boolean, data: string, error: string|null }}
 * @example
 * toDateString(new Date(2026, 4, 21))
 * // { success: true, data: '2026-05-21', error: null }
 */
export function toDateString(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return { success: false, data: '', error: 'date deve ser uma Date válida' }
  }
  try {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return { success: true, data: `${y}-${m}-${d}`, error: null }
  } catch (err) {
    return { success: false, data: '', error: `toDateString: ${err.message}` }
  }
}

/**
 * @param {string} dateStr - Data no formato YYYY-MM-DD
 * @returns {{ success: boolean, data: Date, error: string|null }}
 * @example
 * parseDate('2026-05-21')
 * // { success: true, data: Date(2026, 4, 21), error: null }
 */
export function parseDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { success: false, data: null, error: 'dateStr deve estar no formato YYYY-MM-DD' }
  }
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    if (isNaN(date.getTime())) {
      return { success: false, data: null, error: 'Data inválida' }
    }
    return { success: true, data: date, error: null }
  } catch (err) {
    return { success: false, data: null, error: `parseDate: ${err.message}` }
  }
}
