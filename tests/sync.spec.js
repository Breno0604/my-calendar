import { test, expect } from '@playwright/test'
import { seedStorage, interceptSupabase } from './helpers.js'

const BASE_EVENT = { id: 1, title: 'Evento Teste', description: '', date: '2026-05-21', timeStart: '10:00', timeEnd: '11:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: null, exceptions: {} }

test.beforeEach(async ({ page }) => {
  await seedStorage(page, {
    events: [BASE_EVENT]
  })
})

test('S1: criar evento envia dados corretos ao Supabase', async ({ page }) => {
  const supabaseData = []
  await interceptSupabase(page, supabaseData)
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
  const supabaseData = []
  await interceptSupabase(page, supabaseData)
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
  const supabaseData = []
  await interceptSupabase(page, supabaseData)
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
  const supabaseData = []
  await interceptSupabase(page, supabaseData)
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
  const supabaseData = []
  await interceptSupabase(page, supabaseData)
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

test('S6: excluir evento dispara DELETE ao Supabase com ID correto', async ({ page }) => {
  const supabaseData = []
  await interceptSupabase(page, supabaseData)
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

test('S7: doSync substitui eventos locais pelos dados do Supabase', async ({ page }) => {
  const capture = []
  await interceptSupabase(page, capture)

  await page.goto('/')
  const eventCards = page.locator('.event-capsule, .event-card')
  await expect(eventCards.filter({ hasText: 'Evento Teste' })).toBeVisible()

  await page.locator('.day-cell').filter({ hasText: '22' }).locator('.add-event-inline-btn').click()
  await page.locator('.modal-body input[type="text"]').first().fill('Evento Local')
  await page.locator('.modal-body input[type="time"]').first().fill('14:00')
  await page.locator('.modal-body input[type="time"]').last().fill('15:00')
  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
  await expect(eventCards.filter({ hasText: 'Evento Local' })).toBeVisible()

  await page.route('**/rest/v1/events?select=*&order=date.asc', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 99, title: 'Evento Remoto', description: '', date: '2026-05-22', time_start: '16:00', time_end: '17:00', category_id: 'trabalho', subcategory_id: 'reuniao', recurrence: null, exceptions: {}, reminder: null }
      ])
    })
  })

  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await page.waitForTimeout(1500)

  await expect(eventCards.filter({ hasText: 'Evento Remoto' })).toBeVisible()
  await expect(eventCards.filter({ hasText: 'Evento Teste' })).not.toBeVisible()
  await expect(eventCards.filter({ hasText: 'Evento Local' })).not.toBeVisible()
})

test('S8: doSync pull incorpora evento adicionado por outro device', async ({ page }) => {
  const capture = []
  await interceptSupabase(page, capture)
  await page.goto('/')

  // Register route for events GET doSync will call
  await page.route('**/rest/v1/events?select=*&order=date.asc', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, title: 'Evento Teste', description: '', date: '2026-05-21', time_start: '10:00', time_end: '11:00', category_id: 'pessoal', subcategory_id: 'lazer', recurrence: null, exceptions: {}, reminder: null },
        { id: 2, title: 'Evento Remoto', description: '', date: '2026-05-22', time_start: '14:00', time_end: '15:00', category_id: 'trabalho', subcategory_id: 'reuniao', recurrence: null, exceptions: {}, reminder: null }
      ])
    })
  })

  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await page.waitForTimeout(1500)

  const eventCards = page.locator('.event-capsule, .event-card')
  await expect(eventCards.filter({ hasText: 'Evento Remoto' })).toBeVisible()
  await expect(eventCards.filter({ hasText: 'Evento Teste' })).toBeVisible()
})

test('S9: doSync pull remove evento deletado remotamente por outro device', async ({ page }) => {
  const capture = []
  await interceptSupabase(page, capture)
  await page.goto('/')

  // Register route for events GET — remote has only a substituted event
  await page.route('**/rest/v1/events?select=*&order=date.asc', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 2, title: 'Evento Substituído', description: '', date: '2026-05-22', time_start: '14:00', time_end: '15:00', category_id: 'trabalho', subcategory_id: 'reuniao', recurrence: null, exceptions: {}, reminder: null }
      ])
    })
  })

  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await page.waitForTimeout(1500)

  const eventCards = page.locator('.event-capsule, .event-card')
  await expect(eventCards.filter({ hasText: 'Evento Teste' })).not.toBeVisible()
  await expect(eventCards.filter({ hasText: 'Evento Substituído' })).toBeVisible()
})


