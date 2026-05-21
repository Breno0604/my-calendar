import { test, expect } from '@playwright/test'
import { seedStorage } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await seedStorage(page, {
    events: [
      { id: 40, title: 'Evento Pessoal', description: 'Minha descrição', date: '2026-05-21', timeStart: '10:00', timeEnd: '11:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: null, exceptions: {} },
      { id: 41, title: 'Reunião Trabalho', description: 'Com a equipe', date: '2026-05-21', timeStart: '14:00', timeEnd: '15:00', categoryId: 'trabalho', subcategoryId: 'reuniao', recurrence: null, exceptions: {} }
    ]
  })
  await page.goto('/')
})

test('F1: desmarcar categoria esconde eventos', async ({ page }) => {
  const pessoalCheckbox = page.locator('.filter-item.main-cat-item').first()
  const countBefore = await page.locator('.event-capsule').count()

  await pessoalCheckbox.locator('.custom-checkbox').click()
  await page.waitForTimeout(100)

  const countAfter = await page.locator('.event-capsule').count()
  expect(countAfter).toBeLessThan(countBefore)
})

test('F2: marcar categoria revela eventos', async ({ page }) => {
  const pessoalCheckbox = page.locator('.filter-item.main-cat-item').first()
  await pessoalCheckbox.locator('.custom-checkbox').click()
  await page.waitForTimeout(100)
  const countHidden = await page.locator('.event-capsule').count()

  await pessoalCheckbox.locator('.custom-checkbox').click()
  await page.waitForTimeout(100)
  const countVisible = await page.locator('.event-capsule').count()
  expect(countVisible).toBeGreaterThan(countHidden)
})

test('F3: busca por título funciona', async ({ page }) => {
  await page.locator('.search-input').fill('Reunião')
  await expect(page.locator('.event-capsule').filter({ hasText: 'Reunião' })).toBeVisible()
  await expect(page.locator('.event-capsule').filter({ hasText: 'Pessoal' })).not.toBeVisible()
})

test('F4: busca por descrição funciona', async ({ page }) => {
  await page.locator('.search-input').fill('equipe')
  await expect(page.locator('.event-capsule').filter({ hasText: 'Reunião' })).toBeVisible()
})

test('F5: busca por categoria funciona', async ({ page }) => {
  await page.locator('.search-input').fill('Pessoal')
  await expect(page.locator('.event-capsule').filter({ hasText: 'Pessoal' })).toBeVisible()
})

test('F6: reset filters mostra todos', async ({ page }) => {
  await page.locator('.filter-item.main-cat-item').first().locator('.custom-checkbox').click()
  await page.waitForTimeout(100)

  await page.locator('.clear-filters-btn').click()
  await page.waitForTimeout(100)

  const filterChecks = page.locator('.filter-item.main-cat-item .custom-checkbox')
  const count = await filterChecks.count()
  for (let i = 0; i < count; i++) {
    const bg = await filterChecks.nth(i).evaluate(el => getComputedStyle(el).backgroundColor)
    expect(bg).not.toBe('transparent')
  }
})

test('F7: busca vazia mostra todos os eventos', async ({ page }) => {
  const countBefore = await page.locator('.event-capsule').count()
  await page.locator('.search-input').fill('')
  const countAfter = await page.locator('.event-capsule').count()
  expect(countAfter).toBe(countBefore)
})
