/**
 * @module services/recurrence
 * Pure functions for calculating recurrence rules and expanding event instances.
 */

import { toDateString, parseDate } from './date.js'

/**
 * @param {Date} current
 * @param {Object} r - Recurrence rule with freq='weekly', byDay, interval
 * @returns {{ success: boolean, data: Date|null, error: string|null }}
 */
function getNextWeeklyDate(current, r) {
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
  return { success: true, data: null, error: null }
}

/**
 * @param {Date} current
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
        const weeklyResult = getNextWeeklyDate(current, r)
        if (!weeklyResult.success) return weeklyResult
        if (weeklyResult.data) return { success: true, data: weeklyResult.data, error: null }
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
 * @param {Date} start
 * @param {Object} r - Recurrence rule
 * @param {Date} rangeEndD
 * @param {Date} maxFuture
 * @returns {{ success: boolean, data: Date|null, error: string|null }}
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
 * @param {Object|null} exc - Exception override
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
 * @param {Date} start
 * @param {Date} end
 * @param {string} rangeStart - YYYY-MM-DD
 * @param {Object} event
 * @returns {{ success: boolean, data: Array<Object>, error: string|null }}
 */
function iterateRecurrenceLoop(start, end, rangeStart, event) {
  const results = []
  let count = 0
  let current = new Date(start)
  const r = event.recurrence
  while (current <= end) {
    const dStrResult = toDateString(current)
    if (!dStrResult.success) break
    const dStr = dStrResult.data
    count++
    if (dStr >= rangeStart) {
      const exc = event.exceptions?.[dStr]
      if (!exc?.deleted) {
        const instResult = buildInstanceObject(event, exc, dStr)
        if (instResult.success) results.push(instResult.data)
      }
    }
    if (r.count && count >= r.count) break
    if (count > 1000) break
    const nextResult = getNextRecurDate(current, r)
    if (!nextResult.success) break
    current = nextResult.data
  }
  return { success: true, data: results, error: null }
}

/**
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
    if (!endResult.data) return { success: true, data: [], error: null }

    const loopResult = iterateRecurrenceLoop(start, endResult.data, rangeStart, event)
    if (!loopResult.success) return loopResult
    return { success: true, data: loopResult.data, error: null }
  } catch (err) {
    return { success: false, data: [], error: `expandRecurrences: ${err.message}` }
  }
}

/**
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
    const r = { freq: form.freq, interval: form.interval || 1 }
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

// --- Recurrence action helpers (for handleRecurrenceConfirm) ---

/**
 * @param {number} masterId
 * @param {Array} events
 * @returns {{ success: boolean, data: Array, error: string|null }}
 */
export function deleteSeries(masterId, events) {
  if (!Array.isArray(events)) {
    return { success: false, data: [], error: 'events deve ser um array' }
  }
  try {
    const updated = events.filter(e => e.id !== masterId)
    return { success: true, data: updated, error: null }
  } catch (err) {
    return { success: false, data: [], error: `deleteSeries: ${err.message}` }
  }
}

/**
 * @param {number} masterId
 * @param {string} date - YYYY-MM-DD
 * @param {Array} events
 * @returns {{ success: boolean, data: Array, error: string|null }}
 */
export function deleteOneInstance(masterId, date, events) {
  if (!Array.isArray(events)) {
    return { success: false, data: [], error: 'events deve ser um array' }
  }
  try {
    const updated = events.map(e => {
      if (e.id === masterId) {
        const exc = { ...(e.exceptions || {}), [date]: { deleted: true } }
        return { ...e, exceptions: exc }
      }
      return e
    })
    return { success: true, data: updated, error: null }
  } catch (err) {
    return { success: false, data: [], error: `deleteOneInstance: ${err.message}` }
  }
}

/**
 * @param {number} masterId
 * @param {Object} formData - The edited event form data
 * @param {Array} events
 * @returns {{ success: boolean, data: { events: Array, formData: Object, recurForm: Object }|null, error: string|null }}
 */
export function editSeries(masterId, formData, events) {
  if (!Array.isArray(events)) {
    return { success: false, data: null, error: 'events deve ser um array' }
  }
  try {
    const master = events.find(e => e.id === masterId)
    if (!master) {
      return { success: false, data: null, error: 'Evento mestre não encontrado' }
    }
    const editData = {
      ...master,
      reminder: master.reminder || { enabled: false, minutesBefore: 15 },
      recurrence: master.recurrence ? { ...master.recurrence } : null
    }
    let recurForm = { freq: 'none', interval: 1, endType: 'never', endCount: 10, endDate: '', byDay: [], byMonthDay: 1 }
    if (master.recurrence) {
      const r = master.recurrence
      recurForm = {
        freq: r.freq, interval: r.interval,
        endType: r.until ? 'date' : (r.count ? 'count' : 'never'),
        endCount: r.count || 10, endDate: r.until || '',
        byDay: r.byDay || [], byMonthDay: r.byMonthDay || 1
      }
    }
    return { success: true, data: { events, formData: editData, recurForm }, error: null }
  } catch (err) {
    return { success: false, data: null, error: `editSeries: ${err.message}` }
  }
}

/**
 * @param {number} masterId
 * @param {string} date - Instance date YYYY-MM-DD
 * @param {Array} events
 * @returns {{ success: boolean, data: { events: Array, formData: Object, editingDate: string }|null, error: string|null }}
 */
export function editOneInstance(masterId, date, events) {
  if (!Array.isArray(events)) {
    return { success: false, data: null, error: 'events deve ser um array' }
  }
  try {
    const master = events.find(e => e.id === masterId)
    if (!master) {
      return { success: false, data: null, error: 'Evento mestre não encontrado' }
    }
    if (!master.exceptions) master.exceptions = {}
    const formData = {
      ...master,
      ...master.exceptions[date],
      reminder: master.reminder || { enabled: false, minutesBefore: 15 },
      id: master.id,
      date: date
    }
    return { success: true, data: { events, formData, editingDate: date }, error: null }
  } catch (err) {
    return { success: false, data: null, error: `editOneInstance: ${err.message}` }
  }
}

/**
 * @param {number} masterId
 * @param {string} targetDate - YYYY-MM-DD
 * @param {Array} events
 * @returns {{ success: boolean, data: Array, error: string|null }}
 */
export function moveSeries(masterId, targetDate, events) {
  if (!Array.isArray(events)) {
    return { success: false, data: [], error: 'events deve ser um array' }
  }
  try {
    const updated = events.map(e => {
      if (e.id === masterId) {
        return { ...e, date: targetDate, exceptions: {} }
      }
      return e
    })
    return { success: true, data: updated, error: null }
  } catch (err) {
    return { success: false, data: [], error: `moveSeries: ${err.message}` }
  }
}

/**
 * @param {number} masterId
 * @param {string} sourceDate - Original instance date YYYY-MM-DD
 * @param {string} targetDate - New date YYYY-MM-DD
 * @param {Array} events
 * @returns {{ success: boolean, data: Array, error: string|null }}
 */
export function moveOneInstance(masterId, sourceDate, targetDate, events) {
  if (!Array.isArray(events)) {
    return { success: false, data: [], error: 'events deve ser um array' }
  }
  try {
    const master = events.find(e => e.id === masterId)
    if (!master) return { success: false, data: [], error: 'Evento mestre não encontrado' }
    const exc = { ...(master.exceptions || {}), [sourceDate]: { deleted: true } }
    const updatedMaster = { ...master, exceptions: exc }
    const newId = Date.now()
    const newEvent = { ...master, id: newId, date: targetDate, recurrence: null, exceptions: {} }
    return { success: true, data: events.map(e => e.id === masterId ? updatedMaster : e).concat(newEvent), error: null }
  } catch (err) {
    return { success: false, data: [], error: `moveOneInstance: ${err.message}` }
  }
}
