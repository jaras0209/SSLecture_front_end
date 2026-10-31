import { test, expect, stored, users } from './fixtures'

test.describe('sign-in and routing', () => {
  for (const [username, home] of [
    ['student', '/student'],
    ['teacher', '/teacher'],
    ['pastor', '/teacher'],
    ['parent', '/teacher'],
    ['admin', '/admin']
  ] as const) {
    test(`${username} signs in to ${home} and can sign out`, async ({ page, openWith }) => {
      await openWith('login')
      await page.fill('#login-username', username)
      await page.fill('#login-password', '123456')
      await page.click('form.auth-form button[type=submit]')
      await expect(page).toHaveURL(new RegExp(`${home}$`))

      await page.getByRole('button', { name: /登出/ }).click()
      await expect(page).toHaveURL(/\/login$/)
    })
  }

  test("a page's styles don't carry over to the next account's page", async ({
    page,
    openWith
  }) => {
    const headerDisplay = () =>
      page.locator('.dashboard-header').evaluate((el) => getComputedStyle(el).display)
    const signIn = async (username: string) => {
      await page.fill('#login-username', username)
      await page.fill('#login-password', '123456')
      await page.click('form.auth-form button[type=submit]')
    }

    await openWith('login')
    await signIn('admin')
    await expect(page).toHaveURL(/\/admin$/)
    const fresh = await headerDisplay()
    await page.getByRole('button', { name: /登出/ }).click()

    // The teacher page's global styles (e.g. its flex .dashboard-header) load in this tab...
    await signIn('teacher')
    await expect(page).toHaveURL(/\/teacher$/)
    await page.getByRole('button', { name: /登出/ }).click()

    // ...and must not apply to the admin page afterwards
    await signIn('admin')
    await expect(page).toHaveURL(/\/admin$/)
    expect(await headerDisplay()).toBe(fresh)
  })

  test('rejects a wrong password', async ({ page, openWith }) => {
    await openWith('login')
    await page.fill('#login-username', 'student')
    await page.fill('#login-password', 'wrong')
    await page.click('form.auth-form button[type=submit]')
    await page.waitForTimeout(800)
    await expect(page).toHaveURL(/\/login$/)
  })

  test('sends signed-out visitors to login with a redirect', async ({ page, openWith }) => {
    await openWith('admin')
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)admin$/)
  })

  test('blocks pages outside the signed-in role', async ({ page, openWith }) => {
    await openWith('teacher', { superstart_user: users.student })
    await expect(page).toHaveURL(/\/unauthorized$/)
  })
})

test.describe('login page', () => {
  test('demo-account chips work from the keyboard', async ({ page, openWith }) => {
    await openWith('login')
    const chip = page.locator('.demo-chip').first()
    for (let i = 0; i < 40 && !(await chip.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab')
    }
    await expect(chip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#login-username')).toHaveValue('student')
    await expect(page.locator('#login-password')).toHaveValue('123456')
  })

  test('keeps what was typed when switching between the login and register tabs', async ({
    page,
    openWith
  }) => {
    await openWith('login')
    await page.fill('#login-username', 'someone')
    await page.getByRole('button', { name: '註冊新成員' }).click()
    await page.fill('#reg-username', 'newbie')
    await page.getByRole('button', { name: '登入帳號' }).click()
    await expect(page.locator('#login-username')).toHaveValue('someone')
    await page.getByRole('button', { name: '註冊新成員' }).click()
    await expect(page.locator('#reg-username')).toHaveValue('newbie')
  })

  test('registers a parent with an invite code, binding a child and using up the code', async ({
    page,
    openWith
  }) => {
    await openWith('login', {
      superstart_invite_codes: {
        'SS-PAR-AB12': {
          code: 'SS-PAR-AB12',
          role: 'parent',
          church: '愛與話語',
          createdBy: 'admin',
          createdAt: '2026-01-01T00:00:00.000Z',
          expiresAt: '2099-01-01T00:00:00.000Z',
          revoked: false
        }
      }
    })
    await page.getByRole('button', { name: '註冊新成員' }).click()
    await page.fill('#reg-invite-code', 'SS-PAR-AB12')
    await page.fill('#reg-username', 'mom1')
    await page.fill('#reg-password', 'Abcdef1!')
    await page.locator('.student-binding-option input').first().check()
    await page.click('form.auth-form button[type=submit]')
    await expect(page).toHaveURL(/\/teacher$/)

    const usersDb = await stored<Record<string, { role: string; childUsernames?: string[] }>>(
      page,
      'superstart_users_db'
    )
    expect(usersDb.mom1).toMatchObject({ role: 'parent', childUsernames: ['student'] })
    const invites = await stored<Record<string, { usedBy?: string }>>(
      page,
      'superstart_invite_codes'
    )
    expect(invites['SS-PAR-AB12'].usedBy).toBe('mom1')
  })

  test('language choice applies and survives a reload', async ({ page, openWith }) => {
    await openWith('login')
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page.locator('.auth-tabs .tab-btn').first()).toHaveText('Sign In')
    await page.reload()
    await expect(page.locator('.auth-tabs .tab-btn').first()).toHaveText('Sign In')
  })
})

test.describe('student', () => {
  test('records a listen session that survives a reload', async ({ page, openWith }) => {
    await openWith('student', { superstart_user: users.student })
    const firstCard = page.locator('.course-card').first()
    await expect(firstCard).toContainText('尚未登記')

    await firstCard.click()
    await page.selectOption('#lecturer-select', { index: 1 })
    await page.fill('#notes-input', '很有收穫')
    await page.getByRole('button', { name: /記錄/ }).first().click()
    await expect(firstCard).toContainText('已聽 1 次')

    await page.reload()
    await expect(page.locator('.course-card').first()).toContainText('已聽 1 次')
  })

  test('Shining Project keeps unsaved input while ticking items, and saved info persists', async ({
    page,
    openWith
  }) => {
    await openWith('student', { superstart_user: users.student })
    await page.click('#tab-shining')

    const name = page.locator('input.form-input-clean').first()
    await name.fill('小明')
    await page.locator('.checklist-card label.check-item-row').first().click()
    await expect(name).toHaveValue('小明')

    await page.getByRole('button', { name: /儲存/ }).first().click()
    await page.reload()
    await page.click('#tab-shining')
    await expect(page.locator('input.form-input-clean').first()).toHaveValue('小明')
  })
})

test.describe('teacher', () => {
  test('adds a lecturer through the modal', async ({ page, openWith }) => {
    await openWith('teacher', { superstart_user: users.teacher })
    await page.getByRole('button', { name: '⚙️ 講師管理 / 系統設定' }).click()
    await page.getByRole('button', { name: '➕ 新增講師' }).click()

    await page.click('#btn-save-lecturer') // empty name is rejected
    await expect(page.locator('.lecturer-modal-card')).toBeVisible()

    await page.fill('#input-lecturer-name', '測試講師')
    await page.locator('.courses-checkboxes-grid input').first().check()
    await page.click('#btn-save-lecturer')
    await expect(page.locator('.lecturer-modal-card')).toBeHidden()
    await expect(page.getByText('測試講師')).toBeVisible()

    const lecturers = await stored<{ name: string; courseIds: string[] }[]>(
      page,
      'superstart_lecturers_db'
    )
    expect(lecturers.find((l) => l.name === '測試講師')?.courseIds).toHaveLength(1)
  })
})

test.describe('gender separation', () => {
  test('a teacher sees only students of their gender, and none until their own is set', async ({
    page,
    openWith
  }) => {
    const church = '愛與話語'
    const accounts = (teacherGender?: string) => ({
      teacher: { passwordHash: '123456', role: 'teacher', church, gender: teacherGender },
      student: { passwordHash: '123456', role: 'student', church, gender: 'male' },
      girl: { passwordHash: '123456', role: 'student', church, gender: 'female' }
    })
    const rows = page.locator('.students-table tbody tr')

    await openWith('teacher', {
      superstart_user: users.teacher,
      superstart_users_db: accounts('male')
    })
    await page.getByRole('button', { name: /全體學員名冊/ }).click()
    await expect(rows.filter({ hasText: 'student' })).toHaveCount(1)
    await expect(rows.filter({ hasText: 'girl' })).toHaveCount(0)
    await expect(page.locator('.gender-unset-banner')).toHaveCount(0)

    await openWith('teacher', { superstart_user: users.teacher, superstart_users_db: accounts() })
    await expect(page.locator('.gender-unset-banner')).toBeVisible()
    await page.getByRole('button', { name: /全體學員名冊/ }).click()
    await expect(rows.filter({ hasText: 'student' })).toHaveCount(0)
  })
})

test.describe('lecturer', () => {
  const church = '愛與話語'
  const account = (role: string, gender: string | undefined, realName: string) => ({
    passwordHash: '123456',
    role,
    church,
    gender,
    realName
  })
  const session = (id: string, teacherUsername: string) => ({
    id,
    courseId: 'c1',
    courseTitle: '測試課程',
    lecturerId: 'L1',
    lecturerName: '王講師',
    lecturerTitle: '牧師',
    teacherUsername,
    proposedAt: '2099-01-10T10:00',
    confirmedAt: '2099-01-10T10:00',
    durationMinutes: 90,
    status: 'confirmed',
    prep: { scriptures: [], readingNotes: '', materials: '' },
    teacherSessionNotes: '',
    church,
    isGroupSession: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  })
  const attendee = (sessionId: string, studentUsername: string) => ({
    id: `att_${sessionId}_${studentUsername}`,
    sessionId,
    studentUsername,
    attendanceStatus: 'invited',
    studentFeedback: '',
    teacherFeedback: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  })
  /** A male and a female teacher each booked their student for one lecture by `lecturer` */
  const seed = (lecturer: string) => ({
    superstart_users_db: {
      teacher: account('teacher', 'male', '張老師'),
      pastor: account('pastor', undefined, '王牧師'),
      tf: account('teacher', 'female', '林老師'),
      boy: account('student', 'male', '張弟兄'),
      girl: account('student', 'female', '陳姊妹')
    },
    superstart_lecturers_db: [
      { id: 'L1', name: '王講師', title: '牧師', courseIds: [], church, linkedUsername: lecturer }
    ],
    superstart_booking_sessions_db: { s1: session('s1', 'teacher'), s2: session('s2', 'tf') },
    superstart_booking_attendees_db: {
      att_s1_boy: attendee('s1', 'boy'),
      att_s2_girl: attendee('s2', 'girl')
    }
  })

  test('sees every student of their lecture and records attendance', async ({ page, openWith }) => {
    await openWith('teacher', { superstart_user: users.teacher, ...seed('teacher') })

    await page.locator('#tab-lectures').click()
    const card = page.locator('.lecture-card')
    await expect(card).toHaveCount(1)
    await expect(card).toContainText('張弟兄')
    await expect(card).toContainText('陳姊妹')

    await card
      .locator('.lecture-attendee', { hasText: '陳姊妹' })
      .getByRole('button', { name: /已出席/ })
      .click()
    const attendees = await stored<Record<string, { attendanceStatus: string }>>(
      page,
      'superstart_booking_attendees_db'
    )
    expect(attendees.att_s2_girl.attendanceStatus).toBe('attended')
  })

  test('the tab shows how many finished lectures need attendance', async ({ page, openWith }) => {
    const data = seed('teacher')
    const past = { ...session('s1', 'teacher'), proposedAt: '2020-05-01T10:00' }
    past.confirmedAt = past.proposedAt
    data.superstart_booking_sessions_db = { ...data.superstart_booking_sessions_db, s1: past }
    await openWith('teacher', { superstart_user: users.teacher, ...data })

    const tab = page.locator('#tab-lectures')
    await expect(tab.locator('.tab-badge')).toHaveText('1')
    await tab.click()
    // On a phone the tab row scrolls sideways; the badge must not widen the page
    await page.setViewportSize({ width: 375, height: 800 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
    await page
      .locator('.lecture-card.lecture-due .lecture-attendee', { hasText: '張弟兄' })
      .getByRole('button', { name: /缺席/ })
      .click()
    await expect(tab.locator('.tab-badge')).toHaveCount(0)
  })

  test('a pastor can lecture too, and sees all the church bookings in the overview', async ({
    page,
    openWith
  }) => {
    await openWith('teacher', { superstart_user: users.pastor, ...seed('pastor') })

    await page.locator('#tab-lectures').click()
    await expect(page.locator('.lecture-card .lecture-attendee')).toHaveCount(2)

    await page.getByRole('button', { name: /分區教會總覽/ }).click()
    const rows = page.locator('.church-bookings-table tbody tr[data-session]')
    await expect(rows).toHaveCount(2)
    await expect(rows.filter({ hasText: '林老師' })).toContainText('陳姊妹')
    await expect(rows.filter({ hasText: '張老師' })).toContainText('張弟兄')
  })
})

test.describe('social sign-in', () => {
  test('a user who finishes onboarding gets an account staff can see', async ({
    page,
    openWith
  }) => {
    await openWith('onboarding', {
      superstart_user: {
        username: 'oauth_1',
        role: 'student',
        loginMethod: 'google',
        displayName: 'Google 使用者'
      }
    })
    await page.selectOption('#ob-church', '愛與話語')
    await page.fill('#ob-username', 'amy')
    await page.click('form.auth-form button[type=submit]')
    await expect(page).toHaveURL(/\/student$/)

    const usersDb = await stored<Record<string, Record<string, unknown>>>(
      page,
      'superstart_users_db'
    )
    expect(usersDb.amy).toMatchObject({
      role: 'student',
      church: '愛與話語',
      loginMethod: 'google',
      passwordHash: ''
    })
  })

  test('a parent with an invite code binds their child while onboarding', async ({
    page,
    openWith
  }) => {
    await openWith('onboarding', {
      superstart_user: { username: 'oauth_2', role: 'student', loginMethod: 'line' },
      superstart_invite_codes: {
        'SS-PAR-CD34': {
          code: 'SS-PAR-CD34',
          role: 'parent',
          church: '愛與話語',
          createdBy: 'admin',
          createdAt: '2026-01-01T00:00:00.000Z',
          expiresAt: '2099-01-01T00:00:00.000Z',
          revoked: false
        }
      }
    })
    await page.fill('#ob-invite-code', 'SS-PAR-CD34')
    await page.locator('.student-binding-option', { hasText: 'student' }).locator('input').check()
    await page.click('form.auth-form button[type=submit]')
    await expect(page).toHaveURL(/\/teacher$/)

    const usersDb = await stored<Record<string, { role: string; childUsernames?: string[] }>>(
      page,
      'superstart_users_db'
    )
    expect(usersDb.oauth_2).toMatchObject({ role: 'parent', childUsernames: ['student'] })
  })
})

test.describe('admin', () => {
  test('sees the bookings of every church and can narrow to one', async ({ page, openWith }) => {
    const session = (id: string, church: string) => ({
      id,
      courseId: 'c1',
      courseTitle: '測試課程',
      lecturerId: 'L1',
      lecturerName: '王講師',
      lecturerTitle: '牧師',
      teacherUsername: 'teacher',
      proposedAt: '2099-01-10T10:00',
      durationMinutes: 90,
      status: 'pending',
      prep: { scriptures: [], readingNotes: '', materials: '' },
      teacherSessionNotes: '',
      church,
      isGroupSession: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    })
    await openWith('admin', {
      superstart_user: users.admin,
      superstart_booking_sessions_db: { a: session('a', '愛與話語'), b: session('b', '主大明') }
    })
    const rows = page.locator('.church-bookings-table tbody tr[data-session]')
    await expect(rows).toHaveCount(2)
    await page.selectOption('#church-bookings-church', '主大明')
    await expect(rows).toHaveCount(1)
    await expect(rows).toHaveAttribute('data-session', 'b')
  })

  test('creates a user and generates an invite code', async ({ page, openWith }) => {
    await openWith('admin', { superstart_user: users.admin })

    await page.fill('#new-username', 'e2e-user')
    await page.fill('#new-password', 'secret')
    await page.click('.create-form button[type=submit]')
    await expect(page.locator('.admin-table').first()).toContainText('e2e-user')

    await page.click('#btn-generate-invite')
    const code = (await page.locator('.generated-code-text').innerText()).trim()
    expect(code).toMatch(/^SS-TCH-[0-9A-F]{4}$/)
    await expect(page.locator('.invite-table')).toContainText(code)
  })
})

test.describe('assets', () => {
  test('avatars and sign-in icons are rendered locally', async ({
    page,
    openWith,
    externalHosts
  }) => {
    await openWith('login')
    for (const icon of await page.locator('.social-icon').all()) {
      expect(await icon.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
      expect(await icon.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
    }

    await openWith('student', { superstart_user: users.student })
    const avatar = page.locator('img.avatar-lg')
    await expect
      .poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(1) // not the 1x1 placeholder
    expect(await avatar.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)

    const imageHosts = [...externalHosts].filter((h) => /dicebear|flaticon/.test(h))
    expect(imageHosts).toEqual([])
  })

  test('fonts are self-hosted', async ({ page, openWith, externalHosts }) => {
    await openWith('login')
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.fonts.check('600 16px Quicksand'))).toBe(true)
    expect([...externalHosts].filter((h) => /fonts\.(googleapis|gstatic)/.test(h))).toEqual([])
  })
})
