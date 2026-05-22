/**
 * @module services/db
 * Supabase persistence layer (with localStorage fallback).
 * All functions follow the { success, data, error } contract pattern.
 */

/**
 * Maps a Supabase row to the app's event shape (snake_case → camelCase).
 * @param {Object} row
 * @returns {Object}
 */
function mapEventFromDb(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    date: row.date,
    timeStart: row.time_start,
    timeEnd: row.time_end,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id || '',
    recurrence: row.recurrence,
    exceptions: row.exceptions || {},
    reminder: row.reminder
  }
}

/**
 * Maps an app event object to the Supabase row shape (camelCase → snake_case).
 * @param {Object} e
 * @returns {Object}
 */
function mapEventToDb(e) {
  return {
    id: e.id,
    title: e.title,
    description: e.description || '',
    date: e.date,
    time_start: e.timeStart,
    time_end: e.timeEnd,
    category_id: e.categoryId,
    subcategory_id: e.subcategoryId || '',
    recurrence: e.recurrence,
    exceptions: e.exceptions || {},
    reminder: e.reminder
  }
}

/**
 * Loads all events from Supabase.
 * @param {Object} supabase - Supabase client instance
 * @param {Object} [storage=localStorage] - Fallback storage
 * @returns {Promise<{ success: boolean, data: Array, error: string|null }>}
 * @example
 * await loadEvents(supabase)
 * // { success: true, data: [{ id: 1, title: 'Reunião', ... }], error: null }
 */
export async function loadEvents(supabase, storage = localStorage) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { success: false, data: [], error: 'Supabase client inválido' }
  }
  try {
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true })
    if (error) throw error
    const mapped = (data || []).map(mapEventFromDb)
    return { success: true, data: mapped, error: null }
  } catch (err) {
    try {
      const raw = storage.getItem('sincronia_events')
      if (raw) {
        return { success: true, data: JSON.parse(raw), error: null }
      }
    } catch (_) {}
    return { success: false, data: [], error: `loadEvents: ${err.message}` }
  }
}

/**
 * Upserts all events to Supabase.
 * @param {Object} supabase - Supabase client instance
 * @param {Array} events
 * @returns {Promise<{ success: boolean, data: null, error: string|null }>}
 * @example
 * await saveEvents(supabase, events)
 * // { success: true, data: null, error: null }
 */
export async function saveEvents(supabase, events) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { success: false, data: null, error: 'Supabase client inválido' }
  }
  if (!Array.isArray(events)) {
    return { success: false, data: null, error: 'events deve ser um array' }
  }
  try {
    const rows = events.map(mapEventToDb)
    const { error } = await supabase.from('events').upsert(rows, { onConflict: 'id', ignoreDuplicates: false })
    if (error) throw error
    return { success: true, data: null, error: null }
  } catch (err) {
    return { success: false, data: null, error: `saveEvents: ${err.message}` }
  }
}

/**
 * Loads all categories from Supabase.
 * @param {Object} supabase - Supabase client instance
 * @param {Object} [storage=localStorage] - Fallback storage
 * @returns {Promise<{ success: boolean, data: Array, error: string|null }>}
 * @example
 * await loadCategories(supabase)
 * // { success: true, data: [{ id: 'trabalho', name: 'Trabalho', ... }], error: null }
 */
export async function loadCategories(supabase, storage = localStorage) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { success: false, data: [], error: 'Supabase client inválido' }
  }
  try {
    const { data, error } = await supabase.from('categories').select('*')
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (err) {
    try {
      const raw = storage.getItem('sincronia_categories')
      if (raw) {
        return { success: true, data: JSON.parse(raw), error: null }
      }
    } catch (_) {}
    return { success: false, data: [], error: `loadCategories: ${err.message}` }
  }
}

/**
 * Upserts all categories to Supabase.
 * @param {Object} supabase - Supabase client instance
 * @param {Array} categories
 * @returns {Promise<{ success: boolean, data: null, error: string|null }>}
 * @example
 * await saveCategories(supabase, categories)
 * // { success: true, data: null, error: null }
 */
export async function saveCategories(supabase, categories) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { success: false, data: null, error: 'Supabase client inválido' }
  }
  if (!Array.isArray(categories)) {
    return { success: false, data: null, error: 'categories deve ser um array' }
  }
  try {
    const { error } = await supabase.from('categories').upsert(categories, { onConflict: 'id', ignoreDuplicates: false })
    if (error) throw error
    return { success: true, data: null, error: null }
  } catch (err) {
    return { success: false, data: null, error: `saveCategories: ${err.message}` }
  }
}
