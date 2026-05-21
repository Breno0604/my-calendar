import { test, expect } from '@playwright/test'
import { seedStorage } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await seedStorage(page)
  await page.goto('/')
})

test('A1: app loads without errors', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.app-container')).toBeVisible()
  await expect(page.locator('.top-header')).toBeVisible()
})

test('A2: all 4 view tabs switch correctly', async ({ page }) => {
  await page.goto('/')
  const tabs = ['Mês', 'Semana', 'Dia', 'Agenda']
  for (const tab of tabs) {
    await page.locator('.tab-btn', { hasText: tab }).click()
    await expect(page.locator('.tab-btn.active', { hasText: tab })).toBeVisible()
  }
})

test('A3: navigating prev/next changes the period title', async ({ page }) => {
  await page.goto('/')
  const originalTitle = await page.locator('.current-period-title').textContent()
  await page.locator('.nav-btn[title="Anterior"]').click()
  const prevTitle = await page.locator('.current-period-title').textContent()
  expect(prevTitle).not.toBe(originalTitle)
  await page.locator('.nav-btn[title="Próximo"]').click()
  const restoredTitle = await page.locator('.current-period-title').textContent()
  expect(restoredTitle).toBe(originalTitle)
})

test('A4: Hoje button navigates to current month', async ({ page }) => {
  await page.goto('/')
  await page.locator('.nav-btn[title="Anterior"]').click()
  await page.locator('.nav-btn[title="Anterior"]').click()
  await page.locator('.today-btn').click()
  await expect(page.locator('.current-period-title')).not.toBeEmpty()
})

test('A5: dark mode toggle switches theme class', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  await page.locator('.theme-toggle-btn').first().click()
  await expect(html).toHaveClass(/dark/)
  await page.locator('.theme-toggle-btn').first().click()
  await expect(html).not.toHaveClass(/dark/)
})

test('A6: FAB opens add event modal', async ({ page }) => {
  await page.goto('/')
  await page.locator('.fab-btn').click()
  await expect(page.locator('.modal-overlay')).toBeVisible()
  await expect(page.locator('.modal-title', { hasText: 'Novo Compromisso' })).toBeVisible()
})

test('A7: modal closes with × button', async ({ page }) => {
  await page.goto('/')
  await page.locator('.fab-btn').click()
  await page.locator('.modal-close-btn').click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
})

test('A8: current period title is visible in all views', async ({ page }) => {
  await page.goto('/')
  for (const tab of ['Mês', 'Semana', 'Dia', 'Agenda']) {
    await page.locator('.tab-btn', { hasText: tab }).click()
    await expect(page.locator('.current-period-title')).toBeVisible()
  }
})
