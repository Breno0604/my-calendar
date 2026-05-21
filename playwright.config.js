import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 15000,
  fullyParallel: false,
  workers: 2,
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
