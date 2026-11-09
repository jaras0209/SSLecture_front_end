import { test, expect, users } from './fixtures'

/*
 * The built site carries a Content-Security-Policy (src/utils/csp.ts). These check that it is
 * there, that the pages work within it (nothing they need is blocked), and that it blocks
 * what an injected snippet would do.
 */
test.describe('content security policy', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const seen: string[] = []
      ;(window as unknown as { cspViolations: string[] }).cspViolations = seen
      document.addEventListener('securitypolicyviolation', (e) =>
        seen.push(`${e.violatedDirective} ${e.blockedURI}`)
      )
    })
  })

  const violations = (page: import('@playwright/test').Page) =>
    page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)

  for (const [name, path, user] of [
    ['login', 'login', undefined],
    ['student', 'student', users.student],
    ['teacher', 'teacher', users.teacher],
    ['admin', 'admin', users.admin]
  ] as const) {
    test(`the ${name} page works within the policy`, async ({ page, openWith }) => {
      await openWith(path, user ? { superstart_user: user } : {})
      await page.locator('#app-container').waitFor()
      expect(
        await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
      ).toContain("script-src 'self'")
      // visit every tab, so the parts loaded on demand are checked too
      for (const tab of await page.getByRole('tab').all()) {
        await tab.click()
        await page.waitForTimeout(200)
      }
      expect(await violations(page)).toEqual([])
    })
  }

  test('blocks injected code', async ({ page, openWith }) => {
    await openWith('login')
    const ran = await page.evaluate(async () => {
      const w = window as unknown as { inline?: boolean; handler?: boolean }
      const script = document.createElement('script')
      script.textContent = 'window.inline = true'
      document.body.append(script)
      const div = document.createElement('div')
      div.innerHTML = '<img src="x" onerror="window.handler = true">'
      document.body.append(div)
      await new Promise((r) => setTimeout(r, 300))
      return { inline: !!w.inline, handler: !!w.handler }
    })
    expect(ran).toEqual({ inline: false, handler: false })
  })
})
