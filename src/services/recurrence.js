/**
 * @module services/recurrence
 * Pure functions for calculating recurrence rules and expanding event instances.
 */

import { toDateString, parseDate } from './date.js'

/**
 * @param {Date} current - Current date to advance from
 * @param {Object} r - Recurrence rule { freq, interval, byDay, byMonthDay }
 * @returns {{ success: boolean, data: Date, error: string|null }}
 * @example
 * getNextRecurDate(new Date('2026-05-21'), { freq: 'daily', interval: 2 })
 * // { success: true, data: Date('2026-05-23'), error: null }
 */
export function getNextRecurDate(current, r) {
  if (!(current instanceof Date) || isNaN(current.getTime())) {
    return { success: false, data: null, error: 'current deve ser uma Date válida' }
  }
  if (!r || typeof r.freq !== 'string') {
    return { success: false, data: null, error: 'r deve conter freq (string)' }
  }
  try {
    const d = new Date(current)
    if (r.freq === 'daily') {
      d.setDate(d.getDate() + r.interval)
    } else if (r.freq === 'weekly') {
      if (r.byDay && r.byDay.length > 0) {
        if (r.byDay.length === 7) {
          d.setDate(d.getDate() + r.interval)
          return { success: true, data: d, error: null }
        }
        const DAY_MS = 86400000
        const startWeek = Math.floor(current.getTime() / (7 * DAY_MS))
        for (let i = 1; i <= 14; i++) {
          const test = new Date(current)
          test.setDate(test.getDate() + i)
          if (r.byDay.includes(test.getDay())) {
            const testWeek = Math.floor(test.getTime() / (7 * DAY_MS))
            if ((testWeek - startWeek) % r.interval === 0) {
              return { success: true, data: test, error: null }
            }
          }
        }
      }
      d.setDate(d.getDate() + 7 * r.interval)
    } else if (r.freq === 'monthly') {
      d.setMonth(d.getMonth() + r.interval)
    } else if (r.freq === 'yearly') {
      d.setFullYear(d.getFullYear() + r.interval)
    } else {
      return { success: false, data: null, error: `Frequência desconhecida: ${r.freq}` }
    }
    return { success: true, data: d, error: null }
  } catch (err) {
    return { success: false, data: null, error: `getNextRecurDate: ${err.message}` }
  }
}

/**
 * @param {Date} start - Event start date
 * @param {Object} r - Recurrence rule
 * @param {Date} rangeEndD - End of display range
 * @param {Date} maxFuture - Maximum allowed future date (now + 1 year)
 * @returns {{ success: boolean, data: Date, error: string|null }}
 */
function computeRangeEnd(start, r, rangeEndD, maxFuture) {
  let end = r.until ? parseDate(r.until) : { success: true, data: new Date(maxFuture) }
  if (!end.success) return end
  if (end.data > maxFuture) end = { ...end, data: new Date(maxFuture) }
  if (end.data > rangeEndD) end = { ...end, data: new Date(rangeEndD) }
  if (end.data < start) return { success: true, data: null, error: null }
  return { success: true, data: end.data, error: null }
}

/**
 * @param {Object} event - Master event
 * @param {Object|null} exc - Exception override (title, timeStart, etc.)
 * @param {string} dStr - Instance date string (YYYY-MM-DD)
 * @returns {{ success: boolean, data: Object, error: string|null }}
 */
function buildInstanceObject(event, exc, dStr) {
  try {
    const instance = {
      ...event,
      ...(exc || {}),
      date: dStr,
      id: event.id + '_' + dStr.replace(/-/g, ''),
      _masterId: event.id,
      _isRecurringInstance: true
    }
    return { success: true, data: instance, error: null }
  } catch (err) {
    return { success: false, data: null, error: `buildInstanceObject: ${err.message}` }
  }
}

/**
 * Expands a single recurring event into all instances within a date range.
 * @param {Object} event
 * @param {string} rangeStart - YYYY-MM-DD
 * @param {string} rangeEnd - YYYY-MM-DD
 * @returns {{ success: boolean, data: Array<Object>, error: string|null }}
 * @example
 * expandRecurrences(event, '2026-05-01', '2026-05-31')
 * // { success: true, data: [{ id: '1_20260521', date: '2026-05-21', ... }], error: null }
 */
export function expandRecurrences(event, rangeStart, rangeEnd) {
  if (!event) {
    return { success: false, data: [], error: 'event é obrigatório' }
  }
  if (!event.recurrence) {
    return { success: true, data: [event], error: null }
  }
  if (typeof rangeStart !== 'string' || typeof rangeEnd !== 'string') {
    return { success: false, data: [], error: 'rangeStart e rangeEnd devem ser strings' }
  }
  try {
    const r = event.recurrence
    const startResult = parseDate(event.date)
    if (!startResult.success) return { success: false, data: [], error: startResult.error }
    const start = startResult.data

    const rangeStartDResult = parseDate(rangeStart)
    if (!rangeStartDResult.success) return { success: false, data: [], error: rangeStartDResult.error }
    const rangeStartD = rangeStartDResult.data

    const rangeEndDResult = parseDate(rangeEnd)
    if (!rangeEndDResult.success) return { success: false, data: [], error: rangeEndDResult.error }
    const rangeEndD = rangeEndDResult.data

    const maxFuture = new Date(start)
    maxFuture.setFullYear(maxFuture.getFullYear() + 1)

    const endResult = computeRangeEnd(start, r, rangeEndD, maxFuture)
    if (!endResult.success) return { success: false, data: [], error: endResult.error }
    const end = endResult.data
    if (!end) return { success: true, data: [], error: null }

    const results = []
    let count = 0
    let current = new Date(start)

    while (current <= end) {
      const dStrResult = toDateString(current)
      if (!dStrResult.success) break
      const dStr = dStrResult.data
      count++

      if (dStr >= rangeStart) {
        const exc = event.exceptions?.[dStr]
        if (!exc?.deleted) {
          const instResult = buildInstanceObject(event, exc, dStr)
          if (instResult.success) {
            results.push(instResult.data)
          }
        }
      }

      if (r.count && count >= r.count) break
      if (count > 1000) break

      const nextResult = getNextRecurDate(current, r)
      if (!nextResult.success) break
      current = nextResult.data
    }

    return { success: true, data: results, error: null }
  } catch (err) {
    return { success: false, data: [], error: `expandRecurrences: ${err.message}` }
  }
}

/**
 * Converts a recurrence form object into a recurrence rule for storage.
 * @param {{ freq: string, interval: number, endType: string, endCount: number, endDate: string, byDay: number[], byMonthDay: number }} form
 * @returns {{ success: boolean, data: Object|null, error: string|null }}
 * @example
 * buildRecurrence({ freq: 'daily', interval: 2, endType: 'count', endCount: 5 })
 * // { success: true, data: { freq: 'daily', interval: 2, count: 5 }, error: null }
 */
export function buildRecurrence(form) {
  if (!form || form.freq === 'none') {
    return { success: true, data: null, error: null }
  }
  if (typeof form.freq !== 'string') {
    return { success: false, data: null, error: 'form.freq é obrigatório' }
  }
  try {
    const r = {
      freq: form.freq,
      interval: form.interval || 1
    }
    if (form.freq === 'weekly' && Array.isArray(form.byDay) && form.byDay.length > 0) {
      r.byDay = [...form.byDay]
    }
    if (form.freq === 'monthly') {
      r.byMonthDay = form.byMonthDay || 1
    }
    if (form.endType === 'count') {
      r.count = form.endCount || 10
    } else if (form.endType === 'date') {
      r.until = form.endDate
    }
    return { success: true, data: r, error: null }
  } catch (err) {
    return { success: false, data: null, error: `buildRecurrence: ${err.message}` }
  }
}
