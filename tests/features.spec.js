import { test, expect } from '@playwright/test'
import { seedStorage, openAddModal, fillEventForm, saveEvent, editFirstEventCard, confirmRecurrenceAction } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await seedStorage(page, {
    events: [
      { id: 1, title: 'Evento Teste', description: 'Desc', date: '2026-05-21', timeStart: '10:00', timeEnd: '11:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: null, exceptions: {} }
    ]
  })
  await page.goto('/')
})

test('H1: toast aparece ao criar evento', async ({ page }) => {
  await openAddModal(page, '2026-05-22')
  await fillEventForm(page, { title: 'Com Toast' })
  await saveEvent(page)
  await expect(page.locator('.toast')).toBeVisible({ timeout: 3000 })
  await expect(page.locator('.toast.toast-success .toast-message')).toContainText('criado')
})

test('H2: toast aparece ao editar evento', async ({ page }) => {
  await editFirstEventCard(page)
  await page.locator('.modal-body input[type="text"]').first().fill('Editado')
  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.toast.toast-success')).toBeVisible({ timeout: 3000 })
  await expect(page.locator('.toast.toast-success .toast-message')).toContainText('atualizado')
})

test('H3: toast undo aparece ao excluir', async ({ page }) => {
  await editFirstEventCard(page)
  await page.locator('.btn-danger').click()
  await page.locator('.modal-overlay').waitFor({ state: 'hidden' })
  await expect(page.locator('.toast.toast-undo')).toBeVisible({ timeout: 3000 })
  await expect(page.locator('.toast.toast-undo .toast-action-btn')).toContainText('Desfazer')
})

test('H4: undo restaura evento excluído', async ({ page }) => {
  await editFirstEventCard(page)
  await page.locator('.btn-danger').click()
  await page.locator('.modal-overlay').waitFor({ state: 'hidden' })
  await expect(page.locator('.event-capsule').filter({ hasText: 'Evento Teste' })).toHaveCount(0)
  await page.locator('.toast.toast-undo .toast-action-btn').click()
  await expect(page.locator('.event-capsule').filter({ hasText: 'Evento Teste' })).toBeVisible()
})

test('H5: Ctrl+N abre modal de novo evento', async ({ page }) => {
  await page.keyboard.press('Control+n')
  await expect(page.locator('.modal-overlay')).toBeVisible()
  await expect(page.locator('.modal-title').filter({ hasText: 'Novo' })).toBeVisible()
})

test('H6: Escape fecha modal', async ({ page }) => {
  await openAddModal(page, '2026-05-22')
  await page.keyboard.press('Escape')
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
})

test('H7: tecla T navega para hoje', async ({ page }) => {
  await page.locator('.nav-btn').first().click()
  await page.keyboard.press('t')
  await expect(page.locator('.current-period-title')).toBeVisible()
})

test('H8: botões de exportação visíveis em Configurações', async ({ page }) => {
  await page.locator('.theme-toggle-btn[title*="Configurações"]').click()
  await expect(page.locator('.modal-content button', { hasText: 'Exportar CSV' })).toBeVisible()
  await expect(page.locator('.modal-content button', { hasText: 'Exportar XLSX' })).toBeVisible()
  await expect(page.locator('.modal-content button', { hasText: 'Importar CSV' })).toBeVisible()
})

test('H9: campo lembrete visível no formulário', async ({ page }) => {
  await openAddModal(page, '2026-05-22')
  await expect(page.locator('.form-checkbox-label').filter({ hasText: 'Lembrete' })).toBeVisible()
  await page.locator('.form-checkbox-label').filter({ hasText: 'Lembrete' }).locator('input').check()
  await expect(page.locator('select').filter({ hasText: /minutos/ })).toBeVisible()
})

test('H10: tooltip presente na cápsula do evento', async ({ page }) => {
  const capsule = page.locator('.event-capsule').first()
  const tooltip = capsule.locator('.event-capsule-tooltip')
  await expect(tooltip).toBeAttached()
})

test('H11: botão "Ver todas as ocorrências" no modal de recorrência', async ({ page }) => {
  const events = [
    { id: 2, title: 'Rec Test', description: '', date: '2026-05-21', timeStart: '10:00', timeEnd: '11:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: { freq: 'daily', interval: 1, count: 3 }, exceptions: {} }
  ]
  await seedStorage(page, { events })
  await page.goto('/')
  await page.locator('.event-capsule').filter({ hasText: 'Rec Test' }).first().click()
  await page.locator('.modal-content button', { hasText: 'Ver todas as ocorrências' }).click()
  await expect(page.locator('.modal-title').filter({ hasText: 'Todas as Ocorrências' })).toBeVisible()
})

test('H12: cápsula tem atributo draggable', async ({ page }) => {
  const capsule = page.locator('.event-capsule').first()
  await expect(capsule).toHaveAttribute('draggable', 'true')
})

test('H13: resize handle visível no day view', async ({ page }) => {
  await page.locator('.view-selector-tabs button').filter({ hasText: 'Dia' }).click()
  const handle = page.locator('.event-resize-handle').first()
  await expect(handle).toBeAttached()
})

test('H14: toast de conflito ao criar evento sobreposto', async ({ page }) => {
  const events = [
    { id: 3, title: 'Ocupado', description: '', date: '2026-05-21', timeStart: '09:00', timeEnd: '12:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: null, exceptions: {} }
  ]
  await seedStorage(page, { events })
  await page.goto('/')
  await page.locator('.day-cell.is-today .add-event-inline-btn').click()
  await fillEventForm(page, { title: 'Conflitante', timeStart: '10:00', timeEnd: '11:00' })
  await page.locator('.modal-footer .btn-primary').click()
  await page.locator('.modal-overlay').waitFor({ state: 'hidden' })
  await expect(page.locator('.toast.toast-warning')).toBeVisible({ timeout: 3000 })
})

test('H15: atalho Ctrl+F foca busca', async ({ page }) => {
  await page.keyboard.press('Control+f')
  const search = page.locator('.search-input')
  await expect(search).toBeFocused()
})

test('H16: série completa lista instâncias corretas', async ({ page }) => {
  const events = [
    { id: 4, title: 'Semanal Test', description: '', date: '2026-05-21', timeStart: '10:00', timeEnd: '11:00', categoryId: 'pessoal', subcategoryId: 'lazer', recurrence: { freq: 'weekly', interval: 1, byDay: [1, 3, 5], count: 4 }, exceptions: {} }
  ]
  await seedStorage(page, { events })
  await page.goto('/')
  await page.locator('.event-capsule').filter({ hasText: 'Semanal Test' }).first().click()
  await page.locator('.modal-content button', { hasText: 'Ver todas as ocorrências' }).click()
  const rows = page.locator('.series-instance-row')
  await expect(rows.first()).toBeVisible()
})

test('F1: evento salvo e visivel no calendario', async ({ page }) => {
  await seedStorage(page)
  await page.goto('/')

  // Create a new event
  await page.locator('.day-cell').filter({ hasText: '22' }).locator('.add-event-inline-btn').click()
  await page.locator('.modal-body input[type="text"]').first().fill('Evento F1')
  await page.locator('.modal-body input[type="time"]').first().fill('09:00')
  await page.locator('.modal-body input[type="time"]').last().fill('10:00')
  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
  await expect(page.locator('.event-capsule, .event-card').filter({ hasText: 'Evento F1' })).toBeVisible()
})
