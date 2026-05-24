import { test, expect } from '@playwright/test'
import { seedStorage } from './helpers.js'

const BASE_EVENT = { id: 1, title: 'Evento Teste', description: '', date: '2026-05-21', timeStart: '10:00', timeEnd: '11:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: null, exceptions: {} }

test.beforeEach(async ({ page }) => {
  await seedStorage(page, {
    events: [BASE_EVENT]
  })
})

test('S1: criar evento envia dados corretos ao Supabase', async ({ page }) => {
  await page.goto('/')

  await page.locator(`.day-cell`).filter({ hasText: '22' }).locator('.add-event-inline-btn').click()
  await page.locator('.modal-body input[type="text"]').first().fill('Novo Evento Sync')
  await page.locator('.modal-body input[type="time"]').first().fill('14:00')
  await page.locator('.modal-body input[type="time"]').last().fill('15:00')

  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/rest/v1/events') && req.method() === 'POST'),
    page.locator('.modal-footer .btn-primary').click()
  ])

  const body = request.postDataJSON()
  expect(Array.isArray(body)).toBeTruthy()
  expect(body.some(e => e.title === 'Novo Evento Sync')).toBeTruthy()
  expect(body.some(e => e.date === '2026-05-22')).toBeTruthy()
  expect(body.some(e => e.time_start === '14:00' && e.time_end === '15:00')).toBeTruthy()
})

test('S2: editar evento envia dados atualizados ao Supabase', async ({ page }) => {
  await page.goto('/')

  await page.locator('.event-capsule, .event-card').first().click()
  await page.locator('.modal-body input[type="text"]').first().fill('Título Editado Sync')

  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/rest/v1/events') && req.method() === 'POST'),
    page.locator('.modal-footer .btn-primary').click()
  ])

  const body = request.postDataJSON()
  expect(Array.isArray(body)).toBeTruthy()
  const edited = body.find(e => e.id === 1)
  expect(edited).toBeDefined()
  expect(edited.title).toBe('Título Editado Sync')
})

test('S3: excluir evento dispara DELETE ao Supabase com ID correto', async ({ page }) => {
  await page.goto('/')

  await page.locator('.event-capsule, .event-card').first().click()

  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/rest/v1/events') && req.method() === 'DELETE'),
    page.locator('.modal-footer .btn-danger').click()
  ])

  const delUrl = request.url()
  expect(delUrl).toContain('id=eq.')
  expect(delUrl).toContain('1')
})

test('S4: criar categoria envia dados corretos ao Supabase', async ({ page }) => {
  await page.goto('/')

  await page.locator('.theme-toggle-btn[title="Configurações de Categorias"]').click()
  await page.locator('.settings-section-card input[type="text"]').fill('Financeiro')

  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/rest/v1/categories') && req.method() === 'POST'),
    page.locator('.settings-section-card .btn-primary').click()
  ])

  const body = request.postDataJSON()
  expect(Array.isArray(body)).toBeTruthy()
  const nova = body.find(c => c.name === 'Financeiro')
  expect(nova).toBeDefined()
})

test('S5: editar categoria envia nome atualizado ao Supabase', async ({ page }) => {
  await page.goto('/')

  await page.locator('.theme-toggle-btn[title="Configurações de Categorias"]').click()
  await page.locator('.settings-category-row .btn-secondary').filter({ hasText: 'Editar' }).first().click()
  await page.locator('.settings-category-row input[type="text"]').first().fill('Pessoal Editado')

  const categoryRequest = page.waitForRequest(req =>
    req.url().includes('/rest/v1/categories') && req.method() === 'POST'
  )
  await page.locator('.settings-category-row .btn-primary').filter({ hasText: 'Ok' }).click()

  const request = await categoryRequest
  const body = request.postDataJSON()
  expect(Array.isArray(body)).toBeTruthy()
  const editada = body.find(c => c.id === 'pessoal')
  expect(editada).toBeDefined()
  expect(editada.name).toBe('Pessoal Editado')
})

test('S6: excluir evento dispara DELETE ao Supabase e some do calendario', async ({ page }) => {
  await page.goto('/')

  await page.locator('.event-capsule, .event-card').first().click()

  const [delRequest] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/rest/v1/events') && req.method() === 'DELETE'),
    page.locator('.modal-footer .btn-danger').click()
  ])

  const delUrl = delRequest.url()
  expect(delUrl).toContain('id=eq.')
  expect(delUrl).toContain('1')

  // Evento deve sumir do calendario
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
  const eventCards = page.locator('.event-capsule, .event-card')
  await expect(eventCards.filter({ hasText: 'Evento Teste' })).not.toBeVisible()
})

test('S13: localStorage obsoleto nao recria evento deletado no Supabase ao reconectar', async ({ page }) => {
  // Remote Supabase has only event id=1 (id=2 was deleted by another device)
  const remoteEvents = [
    { id: 1, title: 'Evento Correto', description: '', date: '2026-05-21', time_start: '10:00', time_end: '11:00', category_id: 'pessoal', subcategory_id: 'lazer', recurrence: null, exceptions: {}, reminder: null }
  ]
  const posts = []

  // Intercept all Supabase requests
  await page.route(/127\.0\.0\.1:9999/, async route => {
    const url = route.request().url()
    const method = route.request().method()
    if (!url.includes('/rest/v1/')) {
      await route.abort('connectionrefused'); return
    }
    if (url.includes('/events') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(remoteEvents) })
    } else if (method === 'POST' && url.includes('/rest/v1/events')) {
      const body = route.request().postDataJSON()
      if (Array.isArray(body)) posts.push(...body)
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    } else if (['POST', 'DELETE', 'PATCH', 'PUT'].includes(method)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
  })

  // Seed localStorage with stale data that includes event id=2 (deleted remotely)
  await page.addInitScript(() => {
    localStorage.setItem('sincronia_events', JSON.stringify([
      { id: 1, title: 'Evento Correto', description: '', date: '2026-05-21', time_start: '10:00', time_end: '11:00', category_id: 'pessoal', subcategory_id: 'lazer', recurrence: null, exceptions: {}, reminder: null },
      { id: 2, title: 'Evento Deletado', description: '', date: '2026-05-22', time_start: '14:00', time_end: '15:00', category_id: 'trabalho', subcategory_id: 'reuniao', recurrence: null, exceptions: {}, reminder: null }
    ]))
    localStorage.setItem('sincronia_categories', JSON.stringify([
      { id: 'pessoal', name: 'Pessoal', colorCode: '#10b981', subcategories: [{ id: 'lazer', name: 'Lazer' }] },
      { id: 'trabalho', name: 'Trabalho', colorCode: '#3b82f6', subcategories: [{ id: 'reuniao', name: 'Reunião' }] }
    ]))
    localStorage.setItem('theme', 'light')
    localStorage.setItem('sincronia_fixedDate', '2026-05-21')
  })

  await page.goto('/')

  // Stale event was NEVER pushed to Supabase during onMounted
  const pushedIds = posts.map(e => e.id)
  expect(pushedIds).not.toContain(2)

  // After load, only remote event is visible; stale event is gone
  await expect(page.locator('.event-capsule, .event-card').filter({ hasText: 'Evento Correto' })).toBeVisible()
  await expect(page.locator('.event-capsule, .event-card').filter({ hasText: 'Evento Deletado' })).not.toBeVisible()

  // Stale event was STILL not pushed
  const pushedIdsAfterSync = posts.map(e => e.id)
  expect(pushedIdsAfterSync).not.toContain(2)
})
