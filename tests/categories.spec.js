import { test, expect } from '@playwright/test'
import { seedStorage } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await seedStorage(page)
  await page.goto('/')
})

test('G1: abrir modal de configurações', async ({ page }) => {
  await page.locator('.theme-toggle-btn[title="Configurações de Categorias"]').click()
  await expect(page.locator('.modal-title', { hasText: 'Configurações de Categorias' })).toBeVisible()
  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.modal-overlay')).not.toBeVisible()
})

test('G2: criar nova categoria', async ({ page }) => {
  await page.locator('.theme-toggle-btn[title="Configurações de Categorias"]').click()
  await page.locator('.settings-section-card input[type="text"]').fill('Estudos')
  await page.locator('.settings-section-card .btn-primary').click()

  await page.locator('.modal-footer .btn-primary').click()
  await expect(page.locator('.category-name-text').filter({ hasText: 'ESTUDOS' })).toBeVisible()
})

test('G3: criar subcategoria', async ({ page }) => {
  await page.locator('.theme-toggle-btn[title="Configurações de Categorias"]').click()
  const subInput = page.locator('input[placeholder="Adicionar nova subcategoria..."]').first()
  const addBtn = page.locator('.settings-category-row').first().locator('.btn-secondary', { hasText: '+ Add' })
  await subInput.fill('Nova Sub')
  await addBtn.click()
})

test('G4: deletar categoria com confirmação funciona', async ({ page }) => {
  await page.locator('.theme-toggle-btn[title="Configurações de Categorias"]').click()
  const deleteBtn = page.locator('.settings-category-row .btn-danger').first()
  await deleteBtn.click()
  await page.locator('.modal-footer .btn-primary').click()
})
