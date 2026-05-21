import { test, expect } from '@playwright/test'
import { seedStorage } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await seedStorage(page)
})

test('D1: excluir "apenas esta" remove só uma instância', async ({ page }) => {
  await seedStorage(page, {
    events: [{
      id: 20, title: 'Diario Test', description: '', date: '2026-05-21',
      timeStart: '10:00', timeEnd: '11:00',
      categoryId: 'pessoal', subcategoryId: 'lazer',
      recurrence: { freq: 'daily', interval: 1, count: 5 },
      exceptions: {}
    }]
  })
  await page.goto('/')

  await page.locator('.event-capsule').filter({ hasText: 'Diario Test' }).first().click()
  await expect(page.locator('.modal-title', { hasText: 'Evento Recorrente' })).toBeVisible()

  await page.locator('.modal-content button', { hasText: 'Editar toda a série' }).click()
  await expect(page.locator('.modal-title', { hasText: 'Editar Compromisso' })).toBeVisible()

  await page.locator('.btn-danger').click()
  await expect(page.locator('.modal-title', { hasText: 'Evento Recorrente' })).toBeVisible()

  await page.locator('.modal-content button', { hasText: 'Excluir apenas esta ocorrência' }).click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()

  const remaining = page.locator('.event-capsule').filter({ hasText: 'Diario Test' })
  await expect(remaining).toHaveCount(4)
})

test('D2: excluir "toda a série" remove todas', async ({ page }) => {
  await seedStorage(page, {
    events: [{
      id: 21, title: 'Serie Completa', description: '', date: '2026-05-21',
      timeStart: '10:00', timeEnd: '11:00',
      categoryId: 'pessoal', subcategoryId: 'lazer',
      recurrence: { freq: 'daily', interval: 1, count: 4 },
      exceptions: {}
    }]
  })
  await page.goto('/')

  await page.locator('.event-capsule').filter({ hasText: 'Serie Completa' }).first().click()
  await expect(page.locator('.modal-title', { hasText: 'Evento Recorrente' })).toBeVisible()

  await page.locator('.modal-content button', { hasText: 'Editar toda a série' }).click()
  await expect(page.locator('.modal-title', { hasText: 'Editar Compromisso' })).toBeVisible()

  await page.locator('.btn-danger').click()
  await expect(page.locator('.modal-title', { hasText: 'Evento Recorrente' })).toBeVisible()

  await page.locator('.modal-content button', { hasText: 'Excluir toda a série' }).click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
  await expect(page.locator('.event-capsule').filter({ hasText: 'Serie Completa' })).toHaveCount(0)
})

test('D3: exceção persiste após reload', async ({ page }) => {
  await seedStorage(page, {
    events: [{
      id: 22, title: 'Persiste', description: '', date: '2026-05-21',
      timeStart: '10:00', timeEnd: '11:00',
      categoryId: 'pessoal', subcategoryId: 'lazer',
      recurrence: { freq: 'daily', interval: 1, count: 3 },
      exceptions: { '2026-05-22': { deleted: true } }
    }]
  })
  await page.goto('/')
  await expect(page.locator('.event-capsule').filter({ hasText: 'Persiste' })).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.event-capsule').filter({ hasText: 'Persiste' })).toHaveCount(2)
})

test('D4: editar "apenas esta" título', async ({ page }) => {
  await seedStorage(page, {
    events: [{
      id: 23, title: 'Original', description: '', date: '2026-05-21',
      timeStart: '10:00', timeEnd: '11:00',
      categoryId: 'pessoal', subcategoryId: 'lazer',
      recurrence: { freq: 'daily', interval: 1, count: 3 },
      exceptions: {}
    }]
  })
  await page.goto('/')

  await page.locator('.event-capsule').filter({ hasText: 'Original' }).first().click()
  await expect(page.locator('.modal-title', { hasText: 'Evento Recorrente' })).toBeVisible()

  await page.locator('.modal-content button', { hasText: 'Editar apenas esta ocorrência' }).click()
  await expect(page.locator('.modal-title', { hasText: 'Editar Compromisso' })).toBeVisible()

  const titleInput = page.locator('.modal-body input[type="text"]').first()
  await titleInput.fill('Editada')
  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()

  await expect(page.locator('.event-capsule').filter({ hasText: 'Editada' })).toHaveCount(1)
  await expect(page.locator('.event-capsule').filter({ hasText: 'Original' })).toHaveCount(2)
})

test('D5: editar "toda a série" atualiza todas', async ({ page }) => {
  await seedStorage(page, {
    events: [{
      id: 24, title: 'Antigo', description: '', date: '2026-05-21',
      timeStart: '10:00', timeEnd: '11:00',
      categoryId: 'pessoal', subcategoryId: 'lazer',
      recurrence: { freq: 'daily', interval: 1, count: 3 },
      exceptions: {}
    }]
  })
  await page.goto('/')

  await page.locator('.event-capsule').filter({ hasText: 'Antigo' }).first().click()
  await expect(page.locator('.modal-title', { hasText: 'Evento Recorrente' })).toBeVisible()

  await page.locator('.modal-content button', { hasText: 'Editar toda a série' }).click()
  await expect(page.locator('.modal-title', { hasText: 'Editar Compromisso' })).toBeVisible()

  const titleInput = page.locator('.modal-body input[type="text"]').first()
  await titleInput.fill('Novo Título')
  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()

  await expect(page.locator('.event-capsule').filter({ hasText: 'Novo Título' })).toHaveCount(3)
})
