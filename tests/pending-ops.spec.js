import { test, expect } from '@playwright/test'
import { addPendingOp, removePendingOp, getPendingOps, clearPendingOps, applyPendingOps } from '../src/services/pending-ops.js'

const mockStorage = () => {
  let data = {}
  return {
    getItem: (k) => data[k] || null,
    setItem: (k, v) => { data[k] = v },
    removeItem: (k) => { delete data[k] }
  }
}

test('addPendingOp e getPendingOps', () => {
  const storage = mockStorage()
  addPendingOp(storage, { type: 'create', event: { id: 1, title: 'Teste' }, timestamp: 100 })
  const ops = getPendingOps(storage)
  expect(ops).toHaveLength(1)
  expect(ops[0].type).toBe('create')
})

test('removePendingOp por id do evento', () => {
  const storage = mockStorage()
  addPendingOp(storage, { type: 'create', event: { id: 1 }, timestamp: 100 })
  removePendingOp(storage, 'create', 1)
  expect(getPendingOps(storage)).toHaveLength(0)
})

test('removePendingOp por id direto (delete)', () => {
  const storage = mockStorage()
  addPendingOp(storage, { type: 'delete', id: 5, timestamp: 200 })
  removePendingOp(storage, 'delete', 5)
  expect(getPendingOps(storage)).toHaveLength(0)
})

test('clearPendingOps', () => {
  const storage = mockStorage()
  addPendingOp(storage, { type: 'create', event: { id: 1 }, timestamp: 100 })
  addPendingOp(storage, { type: 'delete', id: 2, timestamp: 200 })
  clearPendingOps(storage)
  expect(getPendingOps(storage)).toHaveLength(0)
})

test('applyPendingOps adiciona creates e remove deletes sobre dados remotos', () => {
  const storage = mockStorage()
  const remote = [{ id: 1, title: 'Remoto' }, { id: 3, title: 'Original' }]
  addPendingOp(storage, { type: 'create', event: { id: 2, title: 'Local' }, timestamp: 100 })
  addPendingOp(storage, { type: 'delete', id: 1, timestamp: 200 })
  addPendingOp(storage, { type: 'edit', event: { id: 3, title: 'Editado' }, timestamp: 300 })
  const result = applyPendingOps(storage, remote)
  expect(result).toHaveLength(2)
  expect(result.find(e => e.id === 1)).toBeUndefined()
  expect(result.find(e => e.id === 2)).toBeDefined()
  expect(result.find(e => e.id === 3).title).toBe('Editado')
})

test('applyPendingOps sem pendências retorna dados originais', () => {
  const storage = mockStorage()
  const remote = [{ id: 1, title: 'Remoto' }]
  expect(applyPendingOps(storage, remote)).toEqual(remote)
})

test('applyPendingOps create ignora id que ja existe no remoto', () => {
  const storage = mockStorage()
  const remote = [{ id: 1, title: 'Original' }]
  addPendingOp(storage, { type: 'create', event: { id: 1, title: 'Duplicado' }, timestamp: 100 })
  const result = applyPendingOps(storage, remote)
  expect(result).toHaveLength(1)
  expect(result[0].title).toBe('Original')
})

test('removePendingOp nao remove operacao de tipo diferente', () => {
  const storage = mockStorage()
  addPendingOp(storage, { type: 'create', event: { id: 1 }, timestamp: 100 })
  addPendingOp(storage, { type: 'delete', id: 1, timestamp: 200 })
  removePendingOp(storage, 'delete', 1)
  const ops = getPendingOps(storage)
  expect(ops).toHaveLength(1)
  expect(ops[0].type).toBe('create')
})
