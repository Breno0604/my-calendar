import { test, expect } from '@playwright/test'
import { seedStorage, openAddModal, fillEventForm, saveEvent } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await seedStorage(page, {
    events: [
      { id: 1, title: 'Evento Existente', description: 'Desc', date: '2026-05-21', timeStart: '10:00', timeEnd: '11:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: null, exceptions: {} }
    ]
  })
  await page.goto('/')
})

test('B1: create event with minimal fields', async ({ page }) => {
  await openAddModal(page, '2026-05-21')
  await fillEventForm(page, { title: 'Teste Mínimo' })
  await saveEvent(page)
  await expect(page.locator('.event-capsule, .event-card').filter({ hasText: 'Teste Mínimo' })).toBeVisible()
})

test('B2: create event with all fields', async ({ page }) => {
  await openAddModal(page, '2026-05-22')
  await fillEventForm(page, {
    title: 'Completo',
    description: 'Descrição completa',
    timeStart: '09:00',
    timeEnd: '10:00'
  })
  await saveEvent(page)
  await expect(page.locator('.event-capsule, .event-card').filter({ hasText: 'Completo' })).toBeVisible()
})

test('B3: + button pre-fills date', async ({ page }) => {
  await page.locator('.day-cell').nth(15).locator('.add-event-inline-btn').click()
  const dateInput = page.locator('.modal-body input[type="date"]')
  await expect(dateInput).not.toHaveValue('')
})

test('B4: edit event title', async ({ page }) => {
  await page.locator('.event-capsule, .event-card').first().click()
  await page.locator('.modal-body input[type="text"]').first().fill('Título Editado')
  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.event-capsule, .event-card').filter({ hasText: 'Título Editado' })).toBeVisible()
})

test('B5: edit event time', async ({ page }) => {
  await page.locator('.event-capsule, .event-card').first().click()
  const timeInputs = page.locator('.modal-body input[type="time"]')
  await timeInputs.first().fill('14:00')
  await timeInputs.last().fill('15:00')
  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.event-time-badge').filter({ hasText: '14:00' })).toBeVisible()
})

test('B6: edit category', async ({ page }) => {
  await page.locator('.event-capsule, .event-card').first().click()
  await page.locator('.modal-body select').first().selectOption('trabalho')
  await page.locator('.modal-footer .btn-primary').click()
})

test('B7: delete event', async ({ page }) => {
  await page.locator('.event-capsule, .event-card').first().click()
  await page.locator('.btn-danger').click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
})

test('B8: save button disabled with empty title', async ({ page }) => {
  await page.locator('.fab-btn').click()
  const saveBtn = page.locator('.modal-footer .btn-primary')
  await expect(saveBtn).toBeDisabled()
})
