/**
 * The admin pages with the backend: accounts and invite codes come from and go to the server.
 * Skipped when the backend has no admin API yet (step 2 of docs/backend_phase1_plan.md).
 */
import { DEMO_PASSWORD, STRONG_PASSWORD, expect, newUsername, signIn, test } from './fixtures'

test.describe('admin with the backend', () => {
  let adminToken = ''

  test.beforeEach(async ({ api }) => {
    adminToken = await api.token('admin', DEMO_PASSWORD)
    test.skip(!(await api.hasAdminApi(adminToken)), 'this backend has no /admin API yet')
  })

  test("lists the server's accounts and creates one there", async ({ page, api }) => {
    const registered = newUsername('listed')
    await api.register(registered)
    await signIn(page, 'admin', DEMO_PASSWORD)
    await expect(page.getByRole('table', { name: '成員清單與存取權限表' })).toContainText(
      registered
    )

    const created = newUsername('made')
    await page.fill('#new-username', created)
    await page.fill('#new-password', 'Temp-123')
    await page.selectOption('#new-role', 'teacher')
    await page
      .locator('#new-username')
      .locator('xpath=ancestor::form')
      .locator('button[type=submit]')
      .click()
    await expect(page.getByRole('table', { name: '成員清單與存取權限表' })).toContainText(created)

    const token = await api.token(created, 'Temp-123')
    const { json } = await api.call<{ role: string; mustChangePassword: boolean }>(
      'GET',
      '/auth/me',
      undefined,
      token
    )
    expect(json!.data).toMatchObject({ role: 'teacher', mustChangePassword: true })
  })

  test('an invite code made on the page registers a teacher', async ({ page, api }) => {
    await signIn(page, 'admin', DEMO_PASSWORD)
    await page.selectOption('#invite-role-select', 'teacher')
    await page.locator('#btn-generate-invite').click()
    const toast = page.locator('.toast-item', { hasText: 'SS-TCH-' })
    await expect(toast).toBeVisible()
    const code = (await toast.innerText()).match(/SS-TCH-[A-Z0-9]{8}/)![0]

    // Someone registers with it on another device
    const username = newUsername('invited')
    const context = await page.context().browser()!.newContext({ baseURL: page.url() })
    const other = await context.newPage()
    await other.goto('login')
    await other.locator('.tab-btn').nth(1).click()
    await other.fill('#reg-invite-code', code)
    await other.fill('#reg-username', username)
    await other.fill('#reg-password', STRONG_PASSWORD)
    await other.locator('form.auth-form button[type=submit]').click()
    await other.waitForURL((url) => !url.pathname.endsWith('/login'))
    await context.close()

    const token = await api.token(username, STRONG_PASSWORD)
    const { json } = await api.call<{ role: string }>('GET', '/auth/me', undefined, token)
    expect(json!.data.role).toBe('teacher')
  })
})
