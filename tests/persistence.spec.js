import { test, expect } from '@playwright/test'
import { seedStorage } from './helpers.js'

test('E1: evento comum sobrevive reload', async ({ page }) => {
  await seedStorage(page, {
    events: [{ id: 30, title: 'Persiste', description: '', date: '2026-05-21', timeStart: '10:00', timeEnd: '11:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: null, exceptions: {} }]
  })
  await page.goto('/')
  await expect(page.locator('.event-capsule').filter({ hasText: 'Persiste' })).toBeVisible()
  await page.reload()
  await expect(page.locator('.event-capsule').filter({ hasText: 'Persiste' })).toBeVisible()
})

test('E2: evento recorrente sobrevive reload', async ({ page }) => {
  await seedStorage(page, {
    events: [{ id: 31, title: 'RecPersiste', description: '', date: '2026-05-21', timeStart: '10:00', timeEnd: '11:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: { freq: 'daily', interval: 1, count: 3 }, exceptions: {} }]
  })
  await page.goto('/')
  await expect(page.locator('.event-capsule').filter({ hasText: 'RecPersiste' })).toHaveCount(3)
  await page.reload()
  await expect(page.locator('.event-capsule').filter({ hasText: 'RecPersiste' })).toHaveCount(3)
})

test('E3: exceção sobrevive reload', async ({ page }) => {
  await seedStorage(page, {
    events: [{ id: 32, title: 'ExcPersiste', description: '', date: '2026-05-21', timeStart: '10:00', timeEnd: '11:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: { freq: 'daily', interval: 1, count: 3 }, exceptions: { '2026-05-22': { deleted: true } } }]
  })
  await page.goto('/')
  await expect(page.locator('.event-capsule').filter({ hasText: 'ExcPersiste' })).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.event-capsule').filter({ hasText: 'ExcPersiste' })).toHaveCount(2)
})

test('E4: categorias sobrevivem reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.category-name-text').first()).toBeVisible()
  await page.reload()
  await expect(page.locator('.category-name-text').first()).toBeVisible()
})

test('E5: evento sobrevive reload mesmo com Supabase vazio (stale)', async ({ page }) => {
  await seedStorage(page, {
    events: [{ id: 33, title: 'SalvoLocal', description: '', date: '2026-05-21', timeStart: '10:00', timeEnd: '11:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: null, exceptions: {} }]
  })
  await page.goto('/')
  await expect(page.locator('.event-capsule').filter({ hasText: 'SalvoLocal' })).toBeVisible()
  await page.reload()
  await expect(page.locator('.event-capsule').filter({ hasText: 'SalvoLocal' })).toBeVisible()
})
