/**
 * @module services/event-utils
 * Pure functions for filtering, grouping, styling, and conflict detection.
 */

import { toDateString, parseDate, formatDateFull } from './date.js'
import { expandRecurrences } from './recurrence.js'

/**
 * @param {string} catId
 * @param {Array<{ id: string, colorCode: string }>} categories
 * @returns {{ success: boolean, data: string, error: string|null }}
 */
export function getCategoryColor(catId, categories) {
  if (!catId || !Array.isArray(categories)) {
    return { success: false, data: '#3b82f6', error: 'catId e categories são obrigatórios' }
  }
  const cat = categories.find(c => c.id === catId)
  return { success: true, data: cat ? cat.colorCode : '#3b82f6', error: null }
}

/**
 * @param {string} catId
 * @param {Array<{ id: string, name: string }>} categories
 * @returns {{ success: boolean, data: string, error: string|null }}
 */
export function getCategoryName(catId, categories) {
  if (!catId || !Array.isArray(categories)) {
    return { success: false, data: 'Sem Categoria', error: 'catId e categories são obrigatórios' }
  }
  const cat = categories.find(c => c.id === catId)
  return { success: true, data: cat ? cat.name : 'Sem Categoria', error: null }
}

/**
 * @param {string} catId
 * @param {string} subId
 * @param {Array<{ id: string, name: string, subcategories: Array<{ id: string, name: string }> }>} categories
 * @returns {{ success: boolean, data: string, error: string|null }}
 */
export function getSubcategoryName(catId, subId, categories) {
  if (!Array.isArray(categories)) {
    return { success: false, data: 'Sem Subcategoria', error: 'categories é obrigatório' }
  }
  const cat = categories.find(c => c.id === catId)
  if (!cat) return { success: true, data: 'Sem Subcategoria', error: null }
  const sub = cat.subcategories.find(s => s.id === subId)
  return { success: true, data: sub ? sub.name : 'Outros', error: null }
}

/**
 * @param {string} catId
 * @param {Array} categories
 * @param {boolean} isDarkMode
 * @returns {{ success: boolean, data: Object, error: string|null }}
 */
export function getEventStyle(catId, categories, isDarkMode) {
  const colorResult = getCategoryColor(catId, categories)
  if (!colorResult.success) {
    return { success: false, data: {}, error: colorResult.error }
  }
  const color = colorResult.data
  try {
    return {
      success: true,
      data: {
        backgroundColor: isDarkMode ? `${color}25` : `${color}12`,
        border: `1px solid ${isDarkMode ? `${color}40` : `${color}25`}`,
        borderLeft: `3px solid ${color}`,
        color: color
      },
      error: null
    }
  } catch (err) {
    return { success: false, data: {}, error: `getEventStyle: ${err.message}` }
  }
}

/**
 * @param {string} catId
 * @param {Array} categories
 * @returns {{ success: boolean, data: Object, error: string|null }}
 */
export function getEventCardStyle(catId, categories) {
  const colorResult = getCategoryColor(catId, categories)
  if (!colorResult.success) {
    return { success: false, data: {}, error: colorResult.error }
  }
  return { success: true, data: { borderLeft: `4px solid ${colorResult.data}` }, error: null }
}

/**
 * @param {Array} events
 * @param {Object} categoryFilters - { [catId]: boolean }
 * @param {Object} subcategoryFilters - { [subId]: boolean }
 * @param {string} searchQuery
 * @param {Array} categories
 * @returns {{ success: boolean, data: Array, error: string|null }}
 */
export function filterEvents(events, categoryFilters, subcategoryFilters, searchQuery, categories) {
  if (!Array.isArray(events)) {
    return { success: false, data: [], error: 'events deve ser um array' }
  }
  try {
    const q = (searchQuery || '').trim().toLowerCase()
    const result = events.filter(e => {
      if (categoryFilters && categoryFilters[e.categoryId] === false) return false
      if (subcategoryFilters && subcategoryFilters[e.subcategoryId] === false) return false
      if (q) {
        const titleMatch = e.title.toLowerCase().includes(q)
        const descMatch = e.description ? e.description.toLowerCase().includes(q) : false
        const cat = categories ? categories.find(c => c.id === e.categoryId) : null
        const catMatch = cat ? cat.name.toLowerCase().includes(q) : false
        let subMatch = false
        if (cat) {
          const sub = cat.subcategories.find(s => s.id === e.subcategoryId)
          subMatch = sub ? sub.name.toLowerCase().includes(q) : false
        }
        if (!titleMatch && !descMatch && !catMatch && !subMatch) return false
      }
      return true
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.timeStart.localeCompare(b.timeStart)
    })
    return { success: true, data: result, error: null }
  } catch (err) {
    return { success: false, data: [], error: `filterEvents: ${err.message}` }
  }
}

/**
 * Groups filtered events by date, expanding recurrences.
 * @param {Array} events - Pre-filtered events
 * @param {Date} currentDate
 * @returns {{ success: boolean, data: Array<{ dateString: string, dateFormatted: string, events: Array }>, error: string|null }}
 */
export function groupEvents(events, currentDate) {
  if (!Array.isArray(events)) {
    return { success: false, data: [], error: 'events deve ser um array' }
  }
  if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
    return { success: false, data: [], error: 'currentDate deve ser uma Date válida' }
  }
  try {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const firstOfNext = new Date(year, month + 1, 1)
    const rangeStartResult = toDateString(firstOfMonth)
    if (!rangeStartResult.success) return { success: false, data: [], error: rangeStartResult.error }
    const rangeEndResult = toDateString(new Date(firstOfNext.getTime() - 1))
    if (!rangeEndResult.success) return { success: false, data: [], error: rangeEndResult.error }

    const groups = {}
    events.forEach(e => {
      const expandedResult = expandRecurrences(e, rangeStartResult.data, rangeEndResult.data)
      if (!expandedResult.success) return
      expandedResult.data.forEach(inst => {
        if (!groups[inst.date]) groups[inst.date] = []
        groups[inst.date].push(inst)
      })
    })

    const sortedDates = Object.keys(groups).sort()
    const result = sortedDates.map(dateStr => {
      groups[dateStr].sort((a, b) => a.timeStart.localeCompare(b.timeStart))
      const dResult = parseDate(dateStr)
      let dateFormatted = dateStr
      if (dResult.success) {
        const fmtResult = formatDateFull(dResult.data)
        if (fmtResult.success) dateFormatted = fmtResult.data
      }
      return { dateString: dateStr, dateFormatted, events: groups[dateStr] }
    })
    return { success: true, data: result, error: null }
  } catch (err) {
    return { success: false, data: [], error: `groupEvents: ${err.message}` }
  }
}

/**
 * Returns expanded events for a single date string.
 * @param {string} dateStr
 * @param {Array} events - Pre-filtered events
 * @returns {{ success: boolean, data: Array, error: string|null }}
 */
export function getEventsForDate(dateStr, events) {
  if (!dateStr || !Array.isArray(events)) {
    return { success: false, data: [], error: 'dateStr e events são obrigatórios' }
  }
  try {
    const result = []
    events.forEach(e => {
      const expandedResult = expandRecurrences(e, dateStr, dateStr)
      if (!expandedResult.success) return
      expandedResult.data.forEach(inst => {
        if (inst.date === dateStr) result.push(inst)
      })
    })
    result.sort((a, b) => a.timeStart.localeCompare(b.timeStart))
    return { success: true, data: result, error: null }
  } catch (err) {
    return { success: false, data: [], error: `getEventsForDate: ${err.message}` }
  }
}

/**
 * Checks whether a date has any (non-deleted) events considering filters.
 * @param {string} dateStr
 * @param {Array} events - Full events array
 * @param {Object} categoryFilters
 * @param {Object} subcategoryFilters
 * @returns {{ success: boolean, data: boolean, error: string|null }}
 */
export function hasEventsOnDate(dateStr, events, categoryFilters, subcategoryFilters) {
  if (!dateStr || !Array.isArray(events)) {
    return { success: false, data: false, error: 'dateStr e events são obrigatórios' }
  }
  try {
    const has = events.some(e => {
      if (categoryFilters && categoryFilters[e.categoryId] === false) return false
      if (subcategoryFilters && subcategoryFilters[e.subcategoryId] === false) return false
      if (e.date === dateStr) {
        const exc = e.exceptions?.[dateStr]
        if (exc?.deleted) return false
        return true
      }
      if (e.recurrence) {
        const expandedResult = expandRecurrences(e, dateStr, dateStr)
        return expandedResult.success && expandedResult.data.some(inst => inst.date === dateStr)
      }
      return false
    })
    return { success: true, data: has, error: null }
  } catch (err) {
    return { success: false, data: false, error: `hasEventsOnDate: ${err.message}` }
  }
}

/**
 * Detects time conflicts for a given slot across all events.
 * @param {string} dateStr
 * @param {string} timeStart - HH:MM
 * @param {string} timeEnd - HH:MM
 * @param {number|null} excludeId - Event ID to exclude (the event being edited)
 * @param {Array} events - Full events array
 * @returns {{ success: boolean, data: Array, error: string|null }}
 * @example
 * detectConflicts('2026-05-21', '10:00', '11:00', null, allEvents)
 * // { success: true, data: [{ title: 'Reunião', ... }], error: null }
 */
export function detectConflicts(dateStr, timeStart, timeEnd, excludeId, events) {
  if (!dateStr || !timeStart || !timeEnd || !Array.isArray(events)) {
    return { success: false, data: [], error: 'dateStr, timeStart, timeEnd e events são obrigatórios' }
  }
  try {
    const conflicts = []
    events.forEach(e => {
      const expandedResult = expandRecurrences(e, dateStr, dateStr)
      if (!expandedResult.success) return
      expandedResult.data.forEach(inst => {
        if (inst.date !== dateStr) return
        if (excludeId && (inst.id === excludeId || inst._masterId === excludeId)) return
        if (inst.timeStart < timeEnd && inst.timeEnd > timeStart) {
          conflicts.push(inst)
        }
      })
    })
    return { success: true, data: conflicts, error: null }
  } catch (err) {
    return { success: false, data: [], error: `detectConflicts: ${err.message}` }
  }
}

/**
 * Identifies events that are due for a reminder notification.
 * @param {Array} events
 * @param {string} today - YYYY-MM-DD
 * @param {number} currentMinutes - Minutes since midnight
 * @returns {{ success: boolean, data: Array, error: string|null }}
 */
export function getEventsDueForReminder(events, today, currentMinutes) {
  if (!Array.isArray(events)) {
    return { success: false, data: [], error: 'events deve ser um array' }
  }
  try {
    const due = events.filter(e => {
      if (e.date !== today || !e.reminder?.enabled) return false
      if (e.reminder.fired) return false
      const [h, m] = e.timeStart.split(':').map(Number)
      const eventMinutes = h * 60 + m
      const reminderTime = eventMinutes - (e.reminder.minutesBefore || 15)
      return currentMinutes >= reminderTime && currentMinutes < eventMinutes
    })
    return { success: true, data: due, error: null }
  } catch (err) {
    return { success: false, data: [], error: `getEventsDueForReminder: ${err.message}` }
  }
}

/**
 * Toggles a day index in a weekly recurrence array (returns new array).
 * @param {number[]} byDay
 * @param {number} idx - Day index 0..6
 * @returns {{ success: boolean, data: number[], error: string|null }}
 * @example
 * toggleDayChip([1, 3], 1) // { success: true, data: [3], error: null }
 * toggleDayChip([3], 1)    // { success: true, data: [1, 3], error: null }
 */
export function toggleDayChip(byDay, idx) {
  if (!Array.isArray(byDay)) {
    return { success: false, data: [], error: 'byDay deve ser um array' }
  }
  if (typeof idx !== 'number' || idx < 0 || idx > 6) {
    return { success: false, data: [...byDay], error: null }
  }
  try {
    const pos = byDay.indexOf(idx)
    let result
    if (pos === -1) {
      result = [...byDay, idx].sort((a, b) => a - b)
    } else {
      result = byDay.filter((_, i) => i !== pos)
    }
    return { success: true, data: result, error: null }
  } catch (err) {
    return { success: false, data: [...byDay], error: `toggleDayChip: ${err.message}` }
  }
}
