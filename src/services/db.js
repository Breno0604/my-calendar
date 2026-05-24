/**
 * @module services/db
 * Supabase persistence layer.
 * All functions follow the { success, data, error } contract pattern.
 */

/** @type {Array<Object>} */
const _channels = []

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
 * @param {Object} supabase
 * @returns {Promise<{ success: boolean, data: Array, error: string|null }>}
 */
export async function loadEvents(supabase) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { success: false, data: [], error: 'Supabase client inválido' }
  }
  try {
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true })
    if (error) throw error
    const mapped = (data || []).map(mapEventFromDb)
    return { success: true, data: mapped, error: null }
  } catch (err) {
    return { success: false, data: [], error: `loadEvents: ${err.message}` }
  }
}

/**
 * Upserts events to Supabase. Does NOT delete events not in the array —
 * individual CRUD operations in App.vue handle deletes via DELETE requests.
 * @param {Object} supabase
 * @param {Array} events
 * @returns {Promise<{ success: boolean, data: null, error: string|null }>}
 */
export async function saveEvents(supabase, events) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { success: false, data: null, error: 'Supabase client inválido' }
  }
  if (!Array.isArray(events)) {
    return { success: false, data: null, error: 'events deve ser um array' }
  }
  if (events.length === 0) {
    return { success: true, data: null, error: null }
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
 * Maps a Supabase row to the app's category shape (snake_case → camelCase).
 * @param {Object} row
 * @returns {Object}
 */
function mapCategoryFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    colorCode: row.color_code,
    subcategories: row.subcategories || []
  }
}

/**
 * Maps an app category object to the Supabase row shape (camelCase → snake_case).
 * @param {Object} cat
 * @returns {Object}
 */
function mapCategoryToDb(cat) {
  return {
    id: cat.id,
    name: cat.name,
    color_code: cat.colorCode,
    subcategories: cat.subcategories || []
  }
}

/**
 * Loads all categories from Supabase.
 * @param {Object} supabase
 * @returns {Promise<{ success: boolean, data: Array, error: string|null }>}
 */
export async function loadCategories(supabase) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { success: false, data: [], error: 'Supabase client inválido' }
  }
  try {
    const { data, error } = await supabase.from('categories').select('*')
    if (error) throw error
    const mapped = (data || []).map(mapCategoryFromDb)
    return { success: true, data: mapped, error: null }
  } catch (err) {
    return { success: false, data: [], error: `loadCategories: ${err.message}` }
  }
}

/**
 * Syncs all categories to Supabase (delete removed + upsert current).
 * @param {Object} supabase
 * @param {Array} categories
 * @returns {Promise<{ success: boolean, data: null, error: string|null }>}
 */
export async function saveCategories(supabase, categories) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { success: false, data: null, error: 'Supabase client inválido' }
  }
  if (!Array.isArray(categories)) {
    return { success: false, data: null, error: 'categories deve ser um array' }
  }
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('categories')
      .select('id')
    if (fetchError) throw fetchError
    const currentIds = new Set(categories.map(c => c.id))
    const toDelete = (existing || []).map(r => r.id).filter(id => !currentIds.has(id))
    if (toDelete.length > 0) {
      const { error: delError } = await supabase.from('categories').delete().in('id', toDelete)
      if (delError) throw delError
    }
    const rows = categories.map(mapCategoryToDb)
    const { error } = await supabase.from('categories').upsert(rows, { onConflict: 'id', ignoreDuplicates: false })
    if (error) throw error
    return { success: true, data: null, error: null }
  } catch (err) {
    return { success: false, data: null, error: `saveCategories: ${err.message}` }
  }
}

/**
 * Subscribes to realtime changes on a table.
 * Calls `onChange` whenever a change is detected.
 * @param {Object} supabase
 * @param {string} table - 'events' or 'categories'
 * @param {Function} onChange
 * @returns {{ success: boolean, error: string|null }}
 */
export function subscribeToTable(supabase, table, onChange) {
  if (!supabase || typeof supabase.channel !== 'function') {
    return { success: false, error: 'Supabase client inválido' }
  }
  try {
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        onChange()
      })
      .subscribe()
    _channels.push(channel)
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: `subscribeToTable: ${err.message}` }
  }
}

/**
 * Unsubscribes all active realtime channels.
 */
export function unsubscribeAll() {
  _channels.forEach(ch => {
    try { ch.unsubscribe() } catch (_) {}
  })
  _channels.length = 0
}
