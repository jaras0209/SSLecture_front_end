import { test, expect, users } from './fixtures'

test.describe('keyboard', () => {
  test('dialogs take focus, keep Tab inside, close on Escape and give focus back', async ({
    page,
    openWith
  }) => {
    await openWith('login')
    const opener = page.locator('.forgot-pwd-link')
    await opener.focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator(':focus')).toHaveCount(1)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      await expect(dialog.locator(':focus')).toHaveCount(1)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('a course can be picked and the profile opened without a mouse', async ({
    page,
    openWith
  }) => {
    await openWith('student', { superstart_user: users.student })
    const card = page.locator('.course-card').nth(2)
    await card.focus()
    await page.keyboard.press('Enter')
    await expect(card).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('#lecturer-select')).toBeVisible()

    const avatar = page.locator('.avatar-clickable')
    await avatar.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(avatar).toBeFocused()
  })
})
