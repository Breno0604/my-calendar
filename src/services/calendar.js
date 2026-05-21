/**
 * @module services/calendar
 * Pure functions for building calendar grid cells (month, week, mini).
 */

import { toDateString, getWeekDayName } from './date.js'

/**
 * @param {number} year
 * @param {number} month - 0-indexed (0=Janeiro)
 * @param {number} i - Cell index (0..41)
 * @param {number} startDay - Day of week for 1st of month (0=Dom)
 * @param {number} daysInMonth
 * @param {number} prevMonthDays
 * @returns {{ success: boolean, data: { day: number, month: number, year: number, isCurrentMonth: boolean }, error: string|null }}
 */
function computeCellDate(year, month, i, startDay, daysInMonth, prevMonthDays) {
  try {
    let cellDay, cellMonth, cellYear, isCurrentMonth
    if (i < startDay) {
      cellDay = prevMonthDays - startDay + 1 + i
      cellMonth = month === 0 ? 11 : month - 1
      cellYear = month === 0 ? year - 1 : year
      isCurrentMonth = false
    } else if (i >= startDay + daysInMonth) {
      cellDay = i - startDay - daysInMonth + 1
      cellMonth = month === 11 ? 0 : month + 1
      cellYear = month === 11 ? year + 1 : year
      isCurrentMonth = false
    } else {
      cellDay = i - startDay + 1
      cellMonth = month
      cellYear = year
      isCurrentMonth = true
    }
    return { success: true, data: { day: cellDay, month: cellMonth, year: cellYear, isCurrentMonth }, error: null }
  } catch (err) {
    return { success: false, data: null, error: `computeCellDate: ${err.message}` }
  }
}

/**
 * @param {number} cellYear
 * @param {number} cellMonth
 * @param {number} cellDay
 * @param {boolean} isCurrentMonth
 * @param {string} todayStr
 * @returns {{ success: boolean, data: Object, error: string|null }}
 */
function buildCellObject(cellYear, cellMonth, cellDay, isCurrentMonth, todayStr) {
  try {
    const dateObj = new Date(cellYear, cellMonth, cellDay)
    const dStrResult = toDateString(dateObj)
    if (!dStrResult.success) {
      return { success: false, data: null, error: dStrResult.error }
    }
    const dStr = dStrResult.data
    return {
      success: true,
      data: {
        dateString: dStr,
        date: dateObj,
        isCurrentMonth,
        isToday: dStr === todayStr,
        dayNumber: cellDay
      },
      error: null
    }
  } catch (err) {
    return { success: false, data: null, error: `buildCellObject: ${err.message}` }
  }
}

/**
 * Builds a 6-week (42-cell) month grid.
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {{ success: boolean, data: { year: number, month: number, cells: Array<Object> }, error: string|null }}
 * @example
 * buildMonthCells(2026, 4)
 * // { success: true, data: { year: 2026, month: 4, cells: [...] }, error: null }
 */
export function buildMonthCells(year, month) {
  if (typeof year !== 'number' || typeof month !== 'number') {
    return { success: false, data: null, error: 'year e month devem ser números' }
  }
  if (month < 0 || month > 11) {
    return { success: false, data: null, error: 'month deve estar entre 0 e 11' }
  }
  try {
    const firstDay = new Date(year, month, 1)
    const startDay = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()
    const todayStrResult = toDateString(new Date())
    if (!todayStrResult.success) return { success: false, data: null, error: todayStrResult.error }
    const todayStr = todayStrResult.data

    const cells = []
    for (let i = 0; i < 42; i++) {
      const cdResult = computeCellDate(year, month, i, startDay, daysInMonth, prevMonthDays)
      if (!cdResult.success) continue
      const { day, month: cMonth, year: cYear, isCurrentMonth } = cdResult.data
      const cellResult = buildCellObject(cYear, cMonth, day, isCurrentMonth, todayStr)
      if (!cellResult.success) continue
      cells.push(cellResult.data)
    }
    return { success: true, data: { year, month, cells }, error: null }
  } catch (err) {
    return { success: false, data: null, error: `buildMonthCells: ${err.message}` }
  }
}

/**
 * Builds a 7-day week array starting from the Sunday of the given date's week.
 * @param {Date} currentDate
 * @returns {{ success: boolean, data: Array<Object>, error: string|null }}
 * @example
 * buildWeekDays(new Date('2026-05-21'))
 * // { success: true, data: [{ date, dayNumber, dayName, isToday, dateString }, ...], error: null }
 */
export function buildWeekDays(currentDate) {
  if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
    return { success: false, data: [], error: 'currentDate deve ser uma Date válida' }
  }
  try {
    const current = new Date(currentDate)
    const currentDayOfWeek = current.getDay()
    const sunday = new Date(current)
    sunday.setDate(current.getDate() - currentDayOfWeek)

    const todayStrResult = toDateString(new Date())
    if (!todayStrResult.success) return { success: false, data: [], error: todayStrResult.error }
    const todayStr = todayStrResult.data

    const days = []
    const tempDate = new Date(sunday)
    for (let i = 0; i < 7; i++) {
      const dStrResult = toDateString(tempDate)
      if (!dStrResult.success) continue
      const dStr = dStrResult.data
      const nameResult = getWeekDayName(i)
      if (!nameResult.success) continue

      days.push({
        date: new Date(tempDate),
        dayNumber: tempDate.getDate(),
        dayName: nameResult.data,
        isToday: dStr === todayStr,
        dateString: dStr
      })
      tempDate.setDate(tempDate.getDate() + 1)
    }
    return { success: true, data: days, error: null }
  } catch (err) {
    return { success: false, data: [], error: `buildWeekDays: ${err.message}` }
  }
}

/**
 * Builds a 35-cell mini calendar grid for the sidebar.
 * @param {Date} currentDate
 * @returns {{ success: boolean, data: Array<Object>, error: string|null }}
 * @example
 * buildMiniCalendarDays(new Date('2026-05-21'))
 * // { success: true, data: [{ date, dayNumber, isCurrentMonth, dateString }, ...], error: null }
 */
export function buildMiniCalendarDays(currentDate) {
  if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
    return { success: false, data: [], error: 'currentDate deve ser uma Date válida' }
  }
  try {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDayOfWeek = firstDay.getDay()
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - startDayOfWeek)

    const cells = []
    const tempDate = new Date(startDate)
    for (let i = 0; i < 35; i++) {
      const dStrResult = toDateString(tempDate)
      if (!dStrResult.success) continue
      cells.push({
        date: new Date(tempDate),
        dayNumber: tempDate.getDate(),
        isCurrentMonth: tempDate.getMonth() === month,
        dateString: dStrResult.data
      })
      tempDate.setDate(tempDate.getDate() + 1)
    }
    return { success: true, data: cells, error: null }
  } catch (err) {
    return { success: false, data: [], error: `buildMiniCalendarDays: ${err.message}` }
  }
}

/**
 * Initializes 3 months of data centered on the current month.
 * @returns {{ success: boolean, data: Array<Object>, activeIdx: number, error: string|null }}
 * @example
 * initInfiniteScrollData()
 * // { success: true, data: [{ year, month, cells }, ...], activeIdx: 1, error: null }
 */
export function initInfiniteScrollData() {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const months = [
      buildMonthCells(currentYear, currentMonth - 1),
      buildMonthCells(currentYear, currentMonth),
      buildMonthCells(currentYear, currentMonth + 1)
    ]
    const validMonths = months.filter(m => m.success).map(m => m.data)
    return { success: true, data: validMonths, activeIdx: 1, error: null }
  } catch (err) {
    return { success: false, data: [], activeIdx: 0, error: `initInfiniteScrollData: ${err.message}` }
  }
}

/**
 * Advances a date by one month (handles year wrap).
 * @param {number} year
 * @param {number} month
 * @returns {{ success: boolean, data: { year: number, month: number }, error: string|null }}
 */
export function nextMonth(year, month) {
  if (typeof year !== 'number' || typeof month !== 'number') {
    return { success: false, data: null, error: 'year e month devem ser números' }
  }
  const m = month === 11 ? 0 : month + 1
  const y = month === 11 ? year + 1 : year
  return { success: true, data: { year: y, month: m }, error: null }
}

/**
 * Retreats a date by one month (handles year wrap).
 * @param {number} year
 * @param {number} month
 * @returns {{ success: boolean, data: { year: number, month: number }, error: string|null }}
 */
export function prevMonth(year, month) {
  if (typeof year !== 'number' || typeof month !== 'number') {
    return { success: false, data: null, error: 'year e month devem ser números' }
  }
  const m = month === 0 ? 11 : month - 1
  const y = month === 0 ? year - 1 : year
  return { success: true, data: { year: y, month: m }, error: null }
}
