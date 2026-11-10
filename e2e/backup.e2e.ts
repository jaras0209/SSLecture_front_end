import { readFile } from 'node:fs/promises'
import { test, expect, users } from './fixtures'

/*
 * An admin exports all data to a file and restores it later (src/utils/backup.ts), in a real
 * browser under the site's Content-Security-Policy.
 */
test('exports all data and restores it from the file', async ({ page, openWith }, testInfo) => {
  const violations: string[] = []
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { csp?: string[] }).csp?.push(e.violatedDirective)
    )
    ;(window as unknown as { csp: string[] }).csp = []
  })

  // A fresh demo where nothing has changed yet: the accounts were never written to storage
  await openWith('admin', { superstart_user: users.admin })
  await expect(page.locator('#btn-export-backup')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#btn-export-backup')
  ])
  expect(download.suggestedFilename()).toMatch(/^sslecture-backup-.*\.json$/)
  const file = testInfo.outputPath('backup.json')
  await download.saveAs(file)
  const backup = JSON.parse(await readFile(file, 'utf8'))
  expect(Object.keys(backup.data.superstart_users_db)).toEqual(
    expect.arrayContaining(['admin', 'teacher', 'student'])
  )
  violations.push(...(await page.evaluate(() => (window as unknown as { csp: string[] }).csp)))

  // Something changes after the backup
  await page.fill('#new-username', 'after-backup')
  await page.fill('#new-password', 'secret')
  await page.click('.create-form button[type=submit]')
  await expect(page.locator('.admin-table').first()).toContainText('after-backup')

  // Restore: confirm, and everyone signs in again
  await page.setInputFiles('#backup-file', file)
  await expect(page.locator('[role="alertdialog"]')).toContainText('個帳號')
  await page.locator('.confirm-actions .btn-danger').click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.locator('.signed-out-note')).toContainText('已從備份還原')

  // The account added after the backup is gone; the ones in it sign in
  const usersDb = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('superstart_users_db')!)
  )
  expect(usersDb['after-backup']).toBeUndefined()
  await page.fill('#login-username', 'teacher')
  await page.fill('#login-password', '123456')
  await page.click('form.auth-form button[type=submit]')
  await expect(page).toHaveURL(/\/teacher$/)

  expect(violations).toEqual([])
})
