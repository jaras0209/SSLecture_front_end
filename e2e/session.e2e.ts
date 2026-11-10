import type { Browser, Page } from '@playwright/test'
import { test, expect } from './fixtures'

/*
 * Sign-ins end after 2 hours idle or when the browser closes, unless "remember me" was ticked
 * (src/utils/session.ts). A closed browser is played by a new browser context that starts with
 * the same saved data (localStorage) but no open tabs and no sessionStorage.
 */

async function signIn(page: Page, remember: boolean) {
  await page.goto('login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('login')
  await page.fill('#login-username', 'student')
  await page.fill('#login-password', '123456')
  if (remember) await page.check('#login-remember')
  await page.click('form.auth-form button[type=submit]')
  await expect(page).toHaveURL(/\/student$/)
}

/** Close the browser and open it again on the same device, back at the student page */
async function reopenBrowser(browser: Browser, page: Page, baseURL: string) {
  const storageState = await page.context().storageState()
  await page.context().close()
  const context = await browser.newContext({ storageState, baseURL })
  const reopened = await context.newPage()
  await reopened.goto('student')
  return reopened
}

test.describe('signing out', () => {
  test('a sign-in not remembered ends when the browser closes', async ({
    page,
    browser,
    baseURL
  }) => {
    await signIn(page, false)
    const reopened = await reopenBrowser(browser, page, baseURL!)
    await expect(reopened).toHaveURL(/\/login/)
    await reopened.context().close()
  })

  test('a remembered sign-in survives closing the browser', async ({ page, browser, baseURL }) => {
    await signIn(page, true)
    const reopened = await reopenBrowser(browser, page, baseURL!)
    await expect(reopened).toHaveURL(/\/student$/)
    await expect(reopened.locator('.logout-btn')).toBeVisible()
    await reopened.context().close()
  })

  test('a reload, or another tab while one is open, keeps the sign-in', async ({ page }) => {
    await signIn(page, false)
    await page.reload()
    await expect(page).toHaveURL(/\/student$/)

    const second = await page.context().newPage()
    await second.goto('student')
    await expect(second).toHaveURL(/\/student$/)
    await expect(second.locator('.logout-btn')).toBeVisible()
  })

  test('2 hours idle signs out, and the login page says why', async ({ page }) => {
    await signIn(page, false)
    // the last activity was 3 hours ago
    await page.evaluate(() => {
      const meta = JSON.parse(localStorage.getItem('superstart_session')!)
      meta.lastActiveAt = Date.now() - 3 * 60 * 60 * 1000
      localStorage.setItem('superstart_session', JSON.stringify(meta))
    })
    await page.reload()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('.signed-out-note')).toContainText('閒置超過 2 小時')
  })
})
