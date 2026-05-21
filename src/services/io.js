/**
 * @module services/io
 * I/O and platform-interfacing functions.
 * All platform dependencies (localStorage, document, Notification, etc.)
 * are passed as parameters — never accessed globally.
 */

/**
 * Saves data to a storage API (e.g. localStorage).
 * @param {string} key
 * @param {*} data
 * @param {Storage} storage - Storage API implementing getItem/setItem
 * @returns {{ success: boolean, data: null, error: string|null }}
 * @example
 * saveToStorage('sincronia_events', events, localStorage)
 * // { success: true, data: null, error: null }
 */
export function saveToStorage(key, data, storage) {
  if (!key || typeof key !== 'string') {
    return { success: false, data: null, error: 'key é obrigatória' }
  }
  if (!storage || typeof storage.setItem !== 'function') {
    return { success: false, data: null, error: 'storage deve implementar setItem' }
  }
  try {
    storage.setItem(key, JSON.stringify(data))
    return { success: true, data: null, error: null }
  } catch (err) {
    return { success: false, data: null, error: `Falha ao salvar "${key}": ${err.message}` }
  }
}

/**
 * Loads and parses data from a storage API.
 * @param {string} key
 * @param {Storage} storage
 * @returns {{ success: boolean, data: *, error: string|null }}
 * @example
 * loadFromStorage('sincronia_events', localStorage)
 * // { success: true, data: [...], error: null }
 */
export function loadFromStorage(key, storage) {
  if (!key || typeof key !== 'string') {
    return { success: false, data: null, error: 'key é obrigatória' }
  }
  if (!storage || typeof storage.getItem !== 'function') {
    return { success: false, data: null, error: 'storage deve implementar getItem' }
  }
  try {
    const raw = storage.getItem(key)
    if (raw === null) {
      return { success: true, data: null, error: null }
    }
    const parsed = JSON.parse(raw)
    return { success: true, data: parsed, error: null }
  } catch (err) {
    return { success: false, data: null, error: `Falha ao carregar "${key}": ${err.message}` }
  }
}

/**
 * Removes a key from a storage API.
 * @param {string} key
 * @param {Storage} storage
 * @example
 * removeFromStorage('sincronia_events', localStorage)
 * // { success: true, data: null, error: null }
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
export function removeFromStorage(key, storage) {
  if (!key || typeof key !== 'string') {
    return { success: false, data: null, error: 'key é obrigatória' }
  }
  if (!storage || typeof storage.removeItem !== 'function') {
    return { success: false, data: null, error: 'storage inválido' }
  }
  try {
    storage.removeItem(key)
    return { success: true, data: null, error: null }
  } catch (err) {
    return { success: false, data: null, error: `Falha ao remover "${key}": ${err.message}` }
  }
}

/**
 * Generates a CSV string from an array of objects.
 * @param {Array<Object>} data
 * @returns {{ success: boolean, data: string, error: string|null }}
 * @example
 * generateCSV([{ Titulo: 'Evento', Data: '2026-05-21' }])
 * // { success: true, data: '"Titulo","Data"\n"Evento","2026-05-21"', error: null }
 */
export function generateCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return { success: false, data: '', error: 'Nenhum dado para exportar' }
  }
  try {
    const header = Object.keys(data[0]).join(',')
    const rows = data.map(row =>
      Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    )
    return { success: true, data: [header, ...rows].join('\n'), error: null }
  } catch (err) {
    return { success: false, data: '', error: `Erro ao gerar CSV: ${err.message}` }
  }
}

/**
 * Generates an XLSX workbook from events and categories data.
 * @param {Array<Object>} data - Events as flat objects
 * @param {Array<Object>} categories
 * @param {Object} xlsxModule - The SheetJS module (from dynamic import)
 * @example
 * generateXLSX(events, categories, XLSX)
 * // { success: true, data: workbook, error: null }
 * @returns {{ success: boolean, data: Object, error: string|null }}
 * data is the workbook (writable via XLSX.writeFile).
 */
export function generateXLSX(data, categories, xlsxModule) {
  if (!xlsxModule || typeof xlsxModule.utils?.book_new !== 'function') {
    return { success: false, data: null, error: 'Módulo XLSX não disponível' }
  }
  if (!Array.isArray(data)) {
    return { success: false, data: null, error: 'data deve ser um array' }
  }
  try {
    const wb = xlsxModule.utils.book_new()
    const ws = xlsxModule.utils.json_to_sheet(data)
    xlsxModule.utils.book_append_sheet(wb, ws, 'Eventos')
    const catSheet = categories.map(c => ({
      Categoria: c.name,
      Cor: c.colorCode,
      Subcategorias: c.subcategories.map(s => s.name).join(', ')
    }))
    const ws2 = xlsxModule.utils.json_to_sheet(catSheet)
    xlsxModule.utils.book_append_sheet(wb, ws2, 'Categorias')
    return { success: true, data: wb, error: null }
  } catch (err) {
    return { success: false, data: null, error: `Erro ao gerar XLSX: ${err.message}` }
  }
}

/**
 * Parses a CSV string into an array of event objects.
 * @param {string} text - Raw CSV content
 * @returns {{ success: boolean, data: Array<Object>, error: string|null }}
 * @example
 * parseCSV('"Titulo","Data"\n"Evento","2026-05-21"')
 * // { success: true, data: [{ title: 'Evento', date: '2026-05-21', ... }], error: null }
 */
export function parseCSV(text) {
  if (!text || typeof text !== 'string') {
    return { success: false, data: [], error: 'Texto CSV é obrigatório' }
  }
  try {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) {
      return { success: false, data: [], error: 'CSV deve ter cabeçalho e ao menos uma linha de dados' }
    }
    const headers = lines[0].split(',').map(h => h.replace(/^"+|"+$/g, '').trim())
    const imported = []
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.replace(/^"+|"+$/g, '').trim())
      const obj = {}
      headers.forEach((h, idx) => { obj[h] = vals[idx] || '' })
      if (obj.Titulo && obj.Data) {
        imported.push({
          id: Date.now() + i,
          title: obj.Titulo,
          description: obj.Descricao || '',
          date: obj.Data,
          timeStart: obj.Inicio || '09:00',
          timeEnd: obj.Fim || '10:00',
          categoryId: 'trabalho',
          subcategoryId: 'reuniao',
          recurrence: null,
          exceptions: {}
        })
      }
    }
    if (imported.length === 0) {
      return { success: false, data: [], error: 'Nenhum evento válido encontrado no CSV' }
    }
    return { success: true, data: imported, error: null }
  } catch (err) {
    return { success: false, data: [], error: `Erro ao processar CSV: ${err.message}` }
  }
}

/**
 * Computes the new timeEnd value after a resize operation.
 * @param {string} startEnd - Original timeEnd in HH:MM format
 * @param {number} deltaY - Mouse movement delta in pixels
 * @param {number} [pixelsPerMinute=0.8] - Scale factor
 * @returns {{ success: boolean, data: string, error: string|null }}
 * @example
 * computeResizeEnd('10:00', 48) // 48px / 0.8 = 60min → '11:00'
 * // { success: true, data: '11:00', error: null }
 */
export function computeResizeEnd(startEnd, deltaY, pixelsPerMinute = 0.8) {
  if (!startEnd || typeof startEnd !== 'string') {
    return { success: false, data: '', error: 'startEnd deve ser uma string HH:MM' }
  }
  try {
    const deltaMinutes = Math.round(deltaY / pixelsPerMinute)
    const [h, m] = startEnd.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) {
      return { success: false, data: '', error: 'startEnd deve estar no formato HH:MM' }
    }
    const totalMinutes = h * 60 + m + deltaMinutes
    const clamped = Math.max(totalMinutes, 1)
    const newH = Math.floor(clamped / 60) % 24
    const newM = clamped % 60
    const result = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
    return { success: true, data: result, error: null }
  } catch (err) {
    return { success: false, data: '', error: `computeResizeEnd: ${err.message}` }
  }
}

/**
 * Requests Notification permission if the API is available.
 * @param {Object} notifApi - The Notification object (typically `window.Notification`)
 * @example
 * requestNotificationPermission(Notification)
 * // { success: true, data: null, error: null }
 * @returns {{ success: boolean, data: string, error: string|null }}
 * data returns the permission state: 'granted' | 'denied' | 'default'
 */
export function requestNotificationPermission(notifApi) {
  if (!notifApi || typeof notifApi.requestPermission !== 'function') {
    return { success: false, data: 'default', error: 'Notification API não disponível' }
  }
  try {
    if (notifApi.permission === 'default') {
      notifApi.requestPermission()
    }
    return { success: true, data: notifApi.permission, error: null }
  } catch (err) {
    return { success: false, data: 'default', error: `requestPermission: ${err.message}` }
  }
}

/**
 * Creates a Blob URL and triggers a file download via a dynamically created <a> element.
 * @param {string} csvString
 * @param {string} filename
 * @param {Document} doc
 * @param {Object} urlApi - Object with createObjectURL / revokeObjectURL (typically URL)
 * @param {Function} BlobCtor - The Blob constructor (typically Blob)
 * @example
 * downloadBlob('data', 'file.csv', document, URL, Blob)
 * // { success: true, data: null, error: null }
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
export function downloadBlob(csvString, filename, doc, urlApi, BlobCtor) {
  if (!doc || typeof doc.createElement !== 'function') {
    return { success: false, data: null, error: 'document não disponível' }
  }
  try {
    const blob = new BlobCtor(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' })
    const url = urlApi.createObjectURL(blob)
    const a = doc.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    urlApi.revokeObjectURL(url)
    return { success: true, data: null, error: null }
  } catch (err) {
    return { success: false, data: null, error: `downloadBlob: ${err.message}` }
  }
}

/**
 * Writes an XLSX workbook to a file download.
 * @param {Object} workbook - SheetJS workbook
 * @param {string} filename
 * @param {Object} xlsxModule
 * @example
 * downloadXLSX(workbook, 'file.xlsx', XLSX)
 * // { success: true, data: null, error: null }
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
export function downloadXLSX(workbook, filename, xlsxModule) {
  if (!xlsxModule || typeof xlsxModule.writeFile !== 'function') {
    return { success: false, data: null, error: 'Módulo XLSX não disponível para escrita' }
  }
  try {
    xlsxModule.writeFile(workbook, filename)
    return { success: true, data: null, error: null }
  } catch (err) {
    return { success: false, data: null, error: `downloadXLSX: ${err.message}` }
  }
}

/**
 * Fire a desktop Notification.
 * @param {string} title
 * @param {string} body
 * @param {string} tag
 * @param {Object} notifApi
 * @example
 * fireNotification('Título', 'Descrição', 'tag-123', Notification)
 * // { success: true, data: null, error: null }
 * @returns {{ success: boolean, data: null, error: string|null }}
 */
export function fireNotification(title, body, tag, notifApi) {
  if (!notifApi || typeof notifApi !== 'function') {
    return { success: false, data: null, error: 'Notification API não disponível' }
  }
  try {
    new notifApi(title, { body, tag })
    return { success: true, data: null, error: null }
  } catch (err) {
    return { success: false, data: null, error: `fireNotification: ${err.message}` }
  }
}
