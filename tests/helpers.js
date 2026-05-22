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
