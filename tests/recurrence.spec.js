import { test, expect } from '@playwright/test'
import { seedStorage, editFirstEventCard, saveEvent } from './helpers.js'

const baseEvent = (id, date) => ({
  id, title: `Recorrente ${id}`, description: '', date,
  timeStart: '10:00', timeEnd: '11:00',
  categoryId: 'pessoal', subcategoryId: 'lazer',
  recurrence: null, exceptions: {}
})

const makeRecurring = (event, rule) => ({ ...event, recurrence: rule, exceptions: {} })

test.beforeEach(async ({ page }) => {
  await seedStorage(page)
  await page.goto('/')
})

test('C1: frequência padrão é "Não repete"', async ({ page }) => {
  await seedStorage(page)
  await page.goto('/')
  await page.locator('.fab-btn').click()
  await expect(page.locator('.modal-body .form-select').nth(2)).toHaveValue('none')
})

test('C2: criar evento diário com 5 ocorrências', async ({ page }) => {
  await seedStorage(page, {
    events: [makeRecurring(baseEvent(10, '2026-05-21'), { freq: 'daily', interval: 1, count: 5 })]
  })
  await page.goto('/')
  const capsules = page.locator('.event-capsule').filter({ hasText: 'Recorrente 10' })
  await expect(capsules).toHaveCount(5)
})

test('C3: diário com intervalo 2 (dias alternados)', async ({ page }) => {
  await seedStorage(page, {
    events: [makeRecurring(baseEvent(11, '2026-05-21'), { freq: 'daily', interval: 2, count: 3 })]
  })
  await page.goto('/')
  const capsules = page.locator('.event-capsule').filter({ hasText: 'Recorrente 11' })
  await expect(capsules).toHaveCount(3)
})

test('C4: semanal Seg+Qua+Sex', async ({ page }) => {
  await seedStorage(page, {
    events: [makeRecurring(baseEvent(12, '2026-05-21'), { freq: 'weekly', interval: 1, byDay: [1, 3, 5], count: 9 })]
  })
  await page.goto('/')
  const capsules = page.locator('.event-capsule').filter({ hasText: 'Recorrente 12' })
  await expect(capsules).toHaveCount(8)
})

test('C5: semanal com intervalo 2', async ({ page }) => {
  await seedStorage(page, {
    events: [makeRecurring(baseEvent(13, '2026-05-21'), { freq: 'weekly', interval: 2, byDay: [1], count: 3 })]
  })
  await page.goto('/')
  const capsules = page.locator('.event-capsule').filter({ hasText: 'Recorrente 13' })
  await expect(capsules).toHaveCount(2)
})

test('C6: mensal dia 15', async ({ page }) => {
  await seedStorage(page, {
    events: [makeRecurring(baseEvent(14, '2026-05-15'), { freq: 'monthly', interval: 1, byMonthDay: 15, count: 3 })]
  })
  await page.goto('/')
  const capsules = page.locator('.event-capsule').filter({ hasText: 'Recorrente 14' })
  await expect(capsules).toHaveCount(1)
})

test('C7: anual', async ({ page }) => {
  await seedStorage(page, {
    events: [makeRecurring(baseEvent(15, '2026-05-21'), { freq: 'yearly', interval: 1, count: 2 })]
  })
  await page.goto('/')
  const capsules = page.locator('.event-capsule').filter({ hasText: 'Recorrente 15' })
  await expect(capsules).toHaveCount(1)
})

test('C8: encerrar "Após 3 ocorrências" gera exatamente 3', async ({ page }) => {
  await seedStorage(page, {
    events: [makeRecurring(baseEvent(16, '2026-05-21'), { freq: 'daily', interval: 1, count: 3 })]
  })
  await page.goto('/')
  const capsules = page.locator('.event-capsule').filter({ hasText: 'Recorrente 16' })
  await expect(capsules).toHaveCount(3)
})

test('C9: evento recorrente tem ícone ⟳', async ({ page }) => {
  await seedStorage(page, {
    events: [makeRecurring(baseEvent(17, '2026-05-21'), { freq: 'daily', interval: 1, count: 2 })]
  })
  await page.goto('/')
  await expect(page.locator('.recur-icon').first()).toBeVisible()
})

test('C10: instâncias não recorrentes não têm ícone ⟳', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.recur-icon')).toHaveCount(0)
})

test('C11: weekly com todos 7 dias = diário', async ({ page }) => {
  await seedStorage(page, {
    events: [makeRecurring(baseEvent(18, '2026-05-21'), { freq: 'weekly', interval: 1, byDay: [0, 1, 2, 3, 4, 5, 6], count: 7 })]
  })
  await page.goto('/')
  const capsules = page.locator('.event-capsule').filter({ hasText: 'Recorrente 18' })
  await expect(capsules).toHaveCount(7)
})
