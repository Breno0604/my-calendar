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
