const STORAGE_KEY = 'sincronia_pendingOps'

export function getPendingOps(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function savePendingOps(storage, ops) {
  storage.setItem(STORAGE_KEY, JSON.stringify(ops))
}

export function addPendingOp(storage, op) {
  const ops = getPendingOps(storage)
  ops.push(op)
  savePendingOps(storage, ops)
}

export function removePendingOp(storage, type, id) {
  let ops = getPendingOps(storage)
  ops = ops.filter(op => !(op.type === type && (op.event?.id === id || op.id === id)))
  savePendingOps(storage, ops)
}

export function clearPendingOps(storage) {
  storage.removeItem(STORAGE_KEY)
}

export function applyPendingOps(storage, remoteData) {
  const ops = getPendingOps(storage)
  if (ops.length === 0) return remoteData

  let result = [...remoteData]

  const deleteIds = new Set(ops.filter(o => o.type === 'delete').map(o => o.id))
  if (deleteIds.size > 0) {
    result = result.filter(e => !deleteIds.has(e.id))
  }

  const editMap = new Map()
  ops.filter(o => o.type === 'edit').forEach(o => {
    if (o.event) editMap.set(o.event.id, o.event)
  })
  if (editMap.size > 0) {
    result = result.map(e => editMap.has(e.id) ? { ...e, ...editMap.get(e.id) } : e)
  }

  const remoteIds = new Set(remoteData.map(e => e.id))
  ops.filter(o => o.type === 'create').forEach(o => {
    if (o.event && !remoteIds.has(o.event.id)) {
      result.push(o.event)
    }
  })

  return result
}
