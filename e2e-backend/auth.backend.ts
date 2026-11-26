/**
 * Sign-in, registration, sign-out and passwords through the page, against the real backend.
 * Checks go through the API only (no database), so they run against any SSLecture_backend.
 */
import {
  DEMO_PASSWORD,
  STRONG_PASSWORD,
  expect,
  newUsername,
  signIn,
  storedTokens,
  test
} from './fixtures'

test.describe('signing in with the backend', () => {
  test('a wrong password shows the server’s answer and asks for nothing else', async ({ page }) => {
    const apiCalls: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/auth/')) apiCalls.push(new URL(r.url()).pathname)
    })
    await page.goto('login')
    await page.fill('#login-username', 'student')
    await page.fill('#login-password', 'not-the-password')
    await page.locator('form.auth-form button[type=submit]').first().click()
    await expect(page.locator('.toast-item', { hasText: '帳號或密碼錯誤' })).toBeVisible()
    expect(apiCalls).toEqual(['/auth/login'])
    await expect(page).toHaveURL(/\/login/)
  })

  test('signs in, keeps the sign-in across a reload, and takes the account from the server', async ({
    page
  }) => {
    await signIn(page, 'student', DEMO_PASSWORD, true)
    const tokens = await storedTokens(page)
    expect(tokens.access).toBeTruthy()
    expect(tokens.refresh).toBeTruthy()

    const me = page.waitForResponse((r) => r.url().endsWith('/auth/me'))
    await page.reload()
    expect((await me).status()).toBe(200)
    await expect(page).not.toHaveURL(/\/login/)
    const user = await page.evaluate(() => JSON.parse(localStorage.getItem('superstart_user')!))
    expect(user).toMatchObject({ username: 'student', role: 'student', church: '愛與話語' })
  })

  test('signing out ends the sign-in on the server', async ({ page, api }) => {
    await signIn(page, 'student', DEMO_PASSWORD)
    const { refresh } = await storedTokens(page)
    await page.locator('.logout-btn').click()
    await expect(page).toHaveURL(/\/login/)
    expect((await storedTokens(page)).refresh).toBeNull()
    // The old refresh token no longer gets a new sign-in
    const { status } = await api.call('POST', '/auth/refresh', { refreshToken: refresh })
    expect(status).toBe(401)
  })

  test('registers a new student, who is signed in afterwards', async ({ page, api }) => {
    const username = newUsername('reg')
    await page.goto('login')
    await page.locator('.tab-btn').nth(1).click()
    await page.fill('#reg-username', username)
    await page.fill('#reg-password', STRONG_PASSWORD)
    await page.locator('form.auth-form button[type=submit]').click()
    await page.waitForURL((url) => !url.pathname.endsWith('/login'))

    const token = await api.token(username, STRONG_PASSWORD)
    const { json } = await api.call<{ role: string; church: string }>(
      'GET',
      '/auth/me',
      undefined,
      token
    )
    expect(json!.data).toMatchObject({ role: 'student', church: '愛與話語' })
  })

  test('changes the own password: the old one stops working', async ({ page, api }) => {
    const username = newUsername('pwd')
    await api.register(username)
    await signIn(page, username, STRONG_PASSWORD)

    await page.locator('.action-btn', { hasText: '修改密碼' }).click()
    const fields = page.locator('.password-change-form input.form-input')
    await fields.nth(0).fill(STRONG_PASSWORD)
    await fields.nth(1).fill('Xyz789!q')
    await fields.nth(2).fill('Xyz789!q')
    await page.locator('.password-change-form button[type=submit]').click()
    await expect(
      page.locator('.password-change-form .alert-box', { hasText: '密碼修改成功' })
    ).toBeVisible()

    expect(
      (await api.call('POST', '/auth/login', { identifier: username, password: STRONG_PASSWORD }))
        .status
    ).toBe(401)
    await api.token(username, 'Xyz789!q')
  })

  test('when the server ends the sign-in, the page returns to the login page and says why', async ({
    page,
    api
  }) => {
    const username = newUsername('end')
    await api.register(username)
    await signIn(page, username, STRONG_PASSWORD)

    // An admin resets this account's password: its sign-ins end
    const admin = await api.token('admin', DEMO_PASSWORD)
    const reset = await api.call(
      'POST',
      '/auth/reset-password',
      { username, newPassword: 'Temp-pass-9' },
      admin
    )
    expect(reset.status).toBe(200)

    await page.reload()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('登入已過期，或帳號已有變更')).toBeVisible()
    expect((await storedTokens(page)).refresh).toBeNull()
  })
})
