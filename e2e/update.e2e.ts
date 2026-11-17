import { test, expect, users } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * A tab opened before a deploy asks for files the deploy removed (each build renames them).
 * Simulate that by answering 404 for a file, and check the app recovers instead of the click
 * doing nothing.
 */

/** Answer 404 for the built file whose name starts with `name`, the first `times` requests */
async function removed(page: Page, name: string, times = Infinity) {
  let left = times
  await page.route(new RegExp(`/assets/${name}-[^/]+\\.js$`), (route) => {
    if (left-- > 0) return route.fulfill({ status: 404, body: '' })
    return route.continue()
  })
}

/** Mark this page load, to tell afterwards whether the page was reloaded */
const mark = (page: Page) => page.evaluate(() => ((window as { mark?: number }).mark = 1))
const marked = (page: Page) => page.evaluate(() => (window as { mark?: number }).mark === 1)

test.describe('after the site is updated', () => {
  test('a new page that can no longer be loaded opens by reloading into it', async ({
    page,
    openWith
  }) => {
    await openWith('student', { superstart_user: users.student })
    await removed(page, 'LoginView', 1) // the old file is gone; after a reload the new one loads
    await mark(page)

    await page.getByRole('button', { name: /登出/ }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.locator('form.auth-form')).toBeVisible()
    expect(await marked(page)).toBe(false) // reloaded, so it now runs the new version
  })

  test('anything else offers a reload instead of losing what is on the page', async ({
    page,
    openWith
  }) => {
    await openWith('login')
    await removed(page, 'en')
    await mark(page)

    await page.getByRole('button', { name: 'EN', exact: true }).click()
    const notice = page.getByRole('alert').filter({ hasText: '部分內容無法載入' })
    await expect(notice).toBeVisible()
    expect(await marked(page)).toBe(true) // not reloaded on its own

    await notice.getByRole('button', { name: '重新載入' }).click()
    await expect.poll(() => marked(page)).toBe(false)
    await expect(notice).toBeHidden()
  })

  test("doesn't reload over and over when the page still can't be loaded", async ({
    page,
    openWith
  }) => {
    await openWith('student', { superstart_user: users.student })
    await removed(page, 'LoginView') // stays missing, e.g. the connection dropped
    let loads = 0
    page.on('load', () => loads++)

    await page.getByRole('button', { name: /登出/ }).click()
    await expect(page.getByRole('alert').filter({ hasText: '部分內容無法載入' })).toBeVisible()
    expect(loads).toBeLessThanOrEqual(1) // one reload at most, then the notice
  })
})
