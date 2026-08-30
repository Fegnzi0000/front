import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'html',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER ? undefined : { command: 'node ./node_modules/vite/bin/vite.js --mode mock --host 127.0.0.1', url: 'http://127.0.0.1:5173/login', reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'], channel: 'chrome', viewport: { width: 390, height: 844 } } },
  ],
})
