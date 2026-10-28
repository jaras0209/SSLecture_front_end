import { test, expect, users } from './fixtures'
import type { Browser, BrowserContext, Page } from '@playwright/test'

/** Two tabs in one browser context share localStorage, so `storage` events flow between them */
async function twoTabs(browser: Browser, seed: Record<string, unknown>) {
  const context: BrowserContext = await browser.newContext({
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei'
  })
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort()
  )
  const a: Page = await context.newPage()
  await a.goto('login')
  await a.evaluate((entries) => {
    localStorage.clear()
    for (const [k, v] of entries) localStorage.setItem(k, JSON.stringify(v))
  }, Object.entries(seed))
  const b: Page = await context.newPage()
  return { context, a, b }
}

test.describe('multiple tabs', () => {
  test('a listen session recorded in one tab shows up in the other', async ({
    browser,
    baseURL
  }) => {
    const { context, a, b } = await twoTabs(browser, { superstart_user: users.student })
    await a.goto(baseURL + 'student')
    await b.goto(baseURL + 'student')
    await expect(b.locator('.course-card').first()).toContainText('尚未登記')

    await a.locator('.course-card').first().click()
    await a.selectOption('#lecturer-select', { index: 1 })
    await a.getByRole('button', { name: /記錄/ }).first().click()

    await expect(b.locator('.course-card').first()).toContainText('已聽 1 次')
    await context.close()
  })

  test('switching language in one tab switches the other', async ({ browser, baseURL }) => {
    const { context, a, b } = await twoTabs(browser, {})
    await a.goto(baseURL + 'login')
    await b.goto(baseURL + 'login')
    await a.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(b.locator('.auth-tabs .tab-btn').first()).toHaveText('Sign In')
    await context.close()
  })

  test('signing out in one tab signs the other out', async ({ browser, baseURL }) => {
    const { context, a, b } = await twoTabs(browser, { superstart_user: users.teacher })
    await a.goto(baseURL + 'teacher')
    await b.goto(baseURL + 'teacher')
    await a.getByRole('button', { name: /登出/ }).click()
    await expect(b).toHaveURL(/\/login$/)
    await context.close()
  })

  test('signing in as someone else in one tab moves the other to that home page', async ({
    browser,
    baseURL
  }) => {
    const { context, a, b } = await twoTabs(browser, { superstart_user: users.teacher })
    await b.goto(baseURL + 'teacher')
    await a.goto(baseURL + 'teacher')
    await a.getByRole('button', { name: /登出/ }).click()
    await expect(b).toHaveURL(/\/login$/)
    await a.fill('#login-username', 'student')
    await a.fill('#login-password', '123456')
    await a.click('form.auth-form button[type=submit]')
    await expect(a).toHaveURL(/\/student$/)
    // b followed the sign-out to the login page, then the new sign-in to the student home
    await expect(b).toHaveURL(/\/student$/)
    await expect(b.locator('.course-card').first()).toBeVisible()
    await context.close()
  })
})
