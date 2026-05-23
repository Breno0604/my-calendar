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

test('S3: excluir evento remove do payload enviado ao Supabase', async ({ page }) => {
  const supabaseData = []
  await interceptSupabase(page, supabaseData)
  await page.goto('/')

  await page.locator('.event-capsule, .event-card').first().click()

  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/rest/v1/events') && req.method() === 'POST'),
    page.locator('.modal-footer .btn-danger').click()
  ])

  const body = request.postDataJSON()
  expect(Array.isArray(body)).toBeTruthy()
  expect(body.some(e => e.id === 1)).toBeFalsy()
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
  await interceptSupabase(page, supabaseData, { initialEventIds: [{ id: 1 }] })
  await page.goto('/')

  await page.locator('.event-capsule, .event-card').first().click()

  const [delRequest, postRequest] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/rest/v1/events') && req.method() === 'DELETE'),
    page.waitForRequest(req => req.url().includes('/rest/v1/events') && req.method() === 'POST'),
    page.locator('.modal-footer .btn-danger').click()
  ])

  const delUrl = delRequest.url()
  expect(delUrl).toContain('id=in.')
  expect(delUrl).toContain('1')

  const body = postRequest.postDataJSON()
  expect(Array.isArray(body)).toBeTruthy()
  expect(body.some(e => e.id === 1)).toBeFalsy()
})

test('S7: sync preserves local events when Supabase fetch returns empty (stale)', async ({ page }) => {

  const capture = []
  await interceptSupabase(page, capture)

  // Stage 1: initial load with existing event
  await page.goto('/')
  const eventCards = page.locator('.event-capsule, .event-card')
  await expect(eventCards.filter({ hasText: 'Evento Teste' })).toBeVisible()

  // Stage 2: create a new event and wait for toast
  await page.locator('.day-cell').filter({ hasText: '22' }).locator('.add-event-inline-btn').click()
  await page.locator('.modal-body input[type="text"]').first().fill('Evento Sync Safe')
  await page.locator('.modal-body input[type="time"]').first().fill('14:00')
  await page.locator('.modal-body input[type="time"]').last().fill('15:00')
  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
  await expect(eventCards.filter({ hasText: 'Evento Sync Safe' })).toBeVisible()

  // Stage 3: trigger doSync while intercept returns empty GET (simulating stale Supabase)
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(1000)

  // Stage 4: local events should still be intact (not overwritten by empty Supabase data)
  await expect(eventCards.filter({ hasText: 'Evento Teste' })).toBeVisible()
  await expect(eventCards.filter({ hasText: 'Evento Sync Safe' })).toBeVisible()
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

test('S10: dirty guard preserva evento local quando saveToStorage falha', async ({ page }) => {
  const capture = []
  await interceptSupabase(page, capture)
  await page.goto('/')

  // Make saveToStorage POST fail so dirty stays true
  await page.route(/rest\/v1\/events/, async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"erro"}' })
    } else {
      await route.fallback()
    }
  })

  // User adds event via FAB
  await page.locator('.fab-btn').click()
  await expect(page.locator('.modal-overlay')).toBeVisible()
  await page.locator('.modal-body input[type="date"]').fill('2026-05-22')
  await page.locator('.modal-body input[type="text"]').first().fill('Evento Local')
  await page.locator('.modal-body input[type="time"]').first().fill('14:00')
  await page.locator('.modal-body input[type="time"]').last().fill('15:00')
  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
  const eventCards = page.locator('.event-capsule, .event-card')
  await expect(eventCards.filter({ hasText: 'Evento Local' })).toBeVisible()

  // Register GET handler for doSync — remote has only the base event (no "Evento Local")
  await page.route('**/rest/v1/events?select=*&order=date.asc', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, title: 'Evento Teste', description: '', date: '2026-05-21', time_start: '10:00', time_end: '11:00', category_id: 'pessoal', subcategory_id: 'lazer', recurrence: null, exceptions: {}, reminder: null }
      ])
    })
  })

  // Trigger doSync — dirty is true, so merge keeps local events
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await page.waitForTimeout(1500)

  await expect(eventCards.filter({ hasText: 'Evento Teste' })).toBeVisible()
  await expect(eventCards.filter({ hasText: 'Evento Local' })).toBeVisible()
})
