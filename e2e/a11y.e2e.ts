import AxeBuilder from '@axe-core/playwright'
import { test, expect, users } from './fixtures'

/** Run axe (WCAG 2.1 A/AA plus best practices) and list any violations readably */
async function violations(page: import('@playwright/test').Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze()
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

test.describe('accessibility', () => {
  for (const [name, path, user] of [
    ['login', 'login', undefined],
    ['student', 'student', users.student],
    ['teacher', 'teacher', users.teacher],
    ['admin', 'admin', users.admin]
  ] as const) {
    for (const width of [1280, 375]) {
      test(`${name} page has no axe violations at ${width}px`, async ({ page, openWith }) => {
        await page.setViewportSize({ width, height: 900 })
        await openWith(path, user ? { superstart_user: user } : {})
        await page.locator('#app-container').waitFor()
        await page.waitForTimeout(500) // let entrance transitions settle
        expect(await violations(page)).toEqual([])
      })
    }
  }

  test('register tab has no axe violations', async ({ page, openWith }) => {
    await openWith('login')
    await page.getByRole('button', { name: '註冊新成員' }).click()
    await page.fill('#reg-password', 'abc')
    expect(await violations(page)).toEqual([])
  })
})

test.describe('page titles', () => {
  test('each page names itself in the browser title, in the current language', async ({
    page,
    openWith
  }) => {
    await openWith('login')
    await expect(page).toHaveTitle('登入 - Shining Star')
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page).toHaveTitle('Sign In - Shining Star')

    await openWith('student', { superstart_user: users.student })
    await expect(page).toHaveTitle('學習與檢視 - Shining Star')
    await openWith('no-such-page')
    await expect(page).toHaveTitle('找不到頁面 - Shining Star')
  })
})

test.describe('motion', () => {
  /** The navbar's pulsing dot: how many times it plays, and whether it is still running */
  async function dot(page: import('@playwright/test').Page) {
    return page.locator('.navbar-logo-dot').evaluate((el) => ({
      iterations: getComputedStyle(el).animationIterationCount,
      running: el.getAnimations().some((a) => a.playState === 'running')
    }))
  }

  test('decorative animations play a few times, then stop', async ({ page, openWith }) => {
    await openWith('student', { superstart_user: users.student })
    expect((await dot(page)).iterations).toBe('3')
    await expect.poll(async () => (await dot(page)).running, { timeout: 8000 }).toBe(false)
  })

  test('nothing moves when the system asks to reduce motion', async ({ page, openWith }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openWith('student', { superstart_user: users.student })
    await expect.poll(async () => (await dot(page)).running).toBe(false)
    const durations = await page.evaluate(() =>
      [...document.querySelectorAll('.btn, .navbar-link, .glass-panel')].map(
        (el) => getComputedStyle(el).transitionDuration
      )
    )
    expect(durations.length).toBeGreaterThan(0)
    expect(durations.every((d) => d.split(',').every((s) => parseFloat(s) < 0.001))).toBe(true)
  })
})
