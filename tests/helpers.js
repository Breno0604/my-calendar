import { expect } from '@playwright/test'

const defaultCategories = [
  { id: 'pessoal', name: 'Pessoal', colorCode: '#10b981', subcategories: [{ id: 'lazer', name: 'Lazer' }, { id: 'saude', name: 'Saúde' }, { id: 'financas', name: 'Finanças' }] },
  { id: 'trabalho', name: 'Trabalho', colorCode: '#3b82f6', subcategories: [{ id: 'reuniao', name: 'Reunião' }, { id: 'projeto', name: 'Projeto' }, { id: 'desenvolvimento', name: 'Desenvolvimento' }] }
]

export async function seedStorage(page, { events = [], categories, theme = 'light', fixedDate = '2026-05-21' } = {}) {
  await page.addInitScript((args) => {
    localStorage.setItem('sincronia_events', JSON.stringify(args.events))
    localStorage.setItem('sincronia_categories', JSON.stringify(args.categories))
    localStorage.setItem('theme', args.theme)
    if (args.fixedDate) {
      localStorage.setItem('sincronia_fixedDate', args.fixedDate)
    }
  }, { events, categories: categories || defaultCategories, theme, fixedDate })

  // Intercept all requests to the mock Supabase endpoint so tests
  // don't actually connect to 127.0.0.1:9999.
  // GET → empty array (triggers localStorage fallback in the app).
  // REST operations → 200/201 (success), so the app's Supabase-first CRUD flow completes.
  // WebSocket etc. → abort.
  await page.route(/127\.0\.0\.1:9999/, async route => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === 'GET' && url.includes('/rest/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    } else if (['POST', 'DELETE', 'PATCH', 'PUT'].includes(method) && url.includes('/rest/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    } else {
      await route.abort('connectionrefused')
    }
  })
}

export async function openAddModal(page, dateStr = null) {
  if (dateStr) {
    await page.locator(`.day-cell`).filter({ hasText: dateStr.split('-')[2].replace(/^0/, '') }).locator('.add-event-inline-btn').click()
  } else {
    await page.locator('.fab-btn').click()
  }
  await expect(page.locator('.modal-overlay')).toBeVisible()
}

export async function fillEventForm(page, fields) {
  if (fields.title !== undefined) await page.locator('.modal-body input[type="text"]').first().fill(fields.title)
  if (fields.description !== undefined) await page.locator('.modal-body textarea').fill(fields.description)
  if (fields.date !== undefined) await page.locator('.modal-body input[type="date"]').fill(fields.date)
  if (fields.timeStart !== undefined) await page.locator('.modal-body input[type="time"]').first().fill(fields.timeStart)
  if (fields.timeEnd !== undefined) await page.locator('.modal-body input[type="time"]').last().fill(fields.timeEnd)
  if (fields.categoryId !== undefined) await page.locator('.modal-body select').first().selectOption(fields.categoryId)
}

export async function saveEvent(page) {
  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
}

export async function setRecurrence(page, freq) {
  const selects = page.locator('.modal-body .form-select')
  const count = await selects.count()
  await selects.nth(count > 2 ? 2 : 1).selectOption(freq)
}

export async function editFirstEventCard(page) {
  const card = page.locator('.event-card, .event-capsule, .list-event-card-wide').first()
  await card.click()
  await expect(page.locator('.modal-overlay')).toBeVisible()
}

export async function confirmRecurrenceAction(page, action) {
  await page.locator('.modal-content button', { hasText: action }).click()
}

/**
 * Intercepts all requests to the mock Supabase REST API.
 * GET `select=id` returns `initialIds` (default `[]`).
 * Other GET requests return empty arrays (triggering localStorage fallback).
 * POST bodies are recorded in the `capture` array for assertions.
 * @param {import('@playwright/test').Page} page
 * @param {Array} capture - Array where intercepted POST bodies will be pushed
 * @param {Object} [options]
 * @param {Array<{id: number|string}>} [options.initialEventIds] - IDs returned for GET events?select=id
 * @param {Array<{id: string}>} [options.initialCategoryIds] - IDs returned for GET categories?select=id
 */
export async function interceptSupabase(page, capture, options = {}) {
  const { initialEventIds = [], initialCategoryIds = [] } = options
  await page.route('http://127.0.0.1:9999/rest/v1/**', async route => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === 'GET' && url.includes('events?select=id')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(initialEventIds) })
    } else if (method === 'GET' && url.includes('categories?select=id')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(initialCategoryIds) })
    } else if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    } else {
      if (method === 'POST') {
        const body = route.request().postDataJSON()
        if (Array.isArray(body)) capture.push(body)
      }
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    }
  })
}
