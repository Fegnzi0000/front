import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function signInAsAdministrator(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('邮箱').fill('admin@mock.local')
  await page.getByLabel('密码').fill('Admin_123')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test('administrator can sign in and navigate core pages', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('当前为 Mock 数据')).toBeVisible()
  await page.getByLabel('邮箱').fill('admin@mock.local')
  await page.getByLabel('密码').fill('Admin_123')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('累计用户')).toBeVisible()
  const userNavigation = page.getByRole('link', { name: '用户管理' })
  if (await userNavigation.isVisible()) await userNavigation.click()
  else { await page.getByRole('button', { name: '打开导航' }).click(); await page.getByRole('link', { name: '用户管理' }).click() }
  await expect(page).toHaveURL(/\/users/)
  await expect(page.getByText('user01@example.com')).toBeVisible()
})

test('dashboard has no serious accessibility violations', async ({ page }) => {
  await signInAsAdministrator(page)
  await expect(page.getByText('累计用户')).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')
  expect(blocking).toEqual([])
})

test('ordinary users are rejected by the administrator portal', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('邮箱').fill('user@mock.local')
  await page.getByLabel('密码').fill('User_123')
  await page.getByRole('button', { name: '登录后台' }).click()
  await expect(page.getByText('该账号不是管理员')).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})
