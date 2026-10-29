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
