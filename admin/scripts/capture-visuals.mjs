import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const output = fileURLToPath(new URL('../output/playwright/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
try {
  await page.goto('http://127.0.0.1:5173/login')
  await page.getByRole('button', { name: '登录后台' }).waitFor()
  await page.screenshot({ path: join(output, 'login.png'), fullPage: true })
  await page.getByLabel('邮箱').fill('admin@mock.local')
  await page.getByLabel('密码').fill('Admin_123')
  await page.getByRole('button', { name: '登录后台' }).click()
  await page.waitForURL('**/dashboard')
  await page.getByText('累计用户').waitFor()
  await page.screenshot({ path: join(output, 'dashboard.png'), fullPage: true })
  await page.getByRole('link', { name: '用户管理' }).click()
  await page.getByText('user01@example.com').waitFor()
  await page.screenshot({ path: join(output, 'users.png'), fullPage: true })
} finally {
  await browser.close()
}
