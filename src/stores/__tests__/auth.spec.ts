import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { translate as t } from '@/i18n'

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  // ── login ────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('returns failure when account does not exist', () => {
      const auth = useAuthStore()
      const result = auth.login('ghost', '123456')
      expect(result.success).toBe(false)
      expect(result.message).toBeTruthy() // message is i18n-translated; locale depends on test env
    })

    it('returns failure when password is wrong', () => {
      const auth = useAuthStore()
      const result = auth.login('student', 'wrong_password')
      expect(result.success).toBe(false)
      expect(result.message).toBeTruthy()
    })

    it('sets currentUser on successful login', () => {
      const auth = useAuthStore()
      const result = auth.login('student', '123456')
      expect(result.success).toBe(true)
      expect(auth.currentUser?.username).toBe('student')
      expect(auth.currentUser?.role).toBe('student')
      expect(auth.isAuthenticated).toBe(true)
    })

    it('records lastLoginAt after login', () => {
      const auth = useAuthStore()
      auth.login('teacher', '123456')
      expect(auth.currentUser?.lastLoginAt).toBeTruthy()
    })
  })

  // ── register ─────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('returns failure when username is already taken', () => {
      const auth = useAuthStore()
      const result = auth.register('student', '123456', 'student')
      expect(result.success).toBe(false)
      expect(result.message).toBeTruthy()
    })

    it('registers a new user successfully', () => {
      const auth = useAuthStore()
      const result = auth.register('newuser', 'mypass', 'student', '愛與話語')
      expect(result.success).toBe(true)
      expect(auth.currentUser?.username).toBe('newuser')
      expect(auth.currentUser?.role).toBe('student')
    })

    it('new user can then log in', () => {
      const auth = useAuthStore()
      auth.logout()
      auth.register('newuser2', 'pass2', 'teacher', '主大明')
      auth.logout()
      const result = auth.login('newuser2', 'pass2')
      expect(result.success).toBe(true)
    })

    it('admin role is assigned without church', () => {
      const auth = useAuthStore()
      auth.register('newadmin', 'adminpass', 'admin')
      expect(auth.currentUser?.church).toBeUndefined()
    })

    it('parent role stores childUsernames', () => {
      const auth = useAuthStore()
      auth.register('newparent', 'parpass', 'parent', '愛與話語', ['student'])
      expect(auth.currentUser?.childUsernames).toEqual(['student'])
    })
  })

  // ── logout ───────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('clears currentUser and isAuthenticated', () => {
      const auth = useAuthStore()
      auth.login('student', '123456')
      auth.logout()
      expect(auth.currentUser).toBeNull()
      expect(auth.isAuthenticated).toBe(false)
    })
  })

  // ── updatePassword ───────────────────────────────────────────────────────

  describe('updatePassword()', () => {
    it('fails when old password is wrong', () => {
      const auth = useAuthStore()
      const result = auth.updatePassword('student', 'wrongOld', 'newPass')
      expect(result.success).toBe(false)
      expect(result.message).toBeTruthy()
    })

    it('fails when account does not exist', () => {
      const auth = useAuthStore()
      const result = auth.updatePassword('nobody', '123456', 'newPass')
      expect(result.success).toBe(false)
    })

    it('changes the password and can login with new password', () => {
      const auth = useAuthStore()
      auth.login('teacher', '123456')
      const result = auth.updatePassword('teacher', '123456', 'newSecret')
      expect(result.success).toBe(true)
      auth.logout()
      expect(auth.login('teacher', 'newSecret').success).toBe(true)
    })
  })

  // ── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile()', () => {
    it('updates displayName and syncs to currentUser', () => {
      const auth = useAuthStore()
      auth.login('student', '123456')
      auth.updateProfile('student', { displayName: '小明' })
      expect(auth.currentUser?.displayName).toBe('小明')
    })

    it('updates realName', () => {
      const auth = useAuthStore()
      auth.login('student', '123456')
      auth.updateProfile('student', { realName: '王小明' })
      expect(auth.currentUser?.realName).toBe('王小明')
    })

    it('returns failure for non-existent account', () => {
      const auth = useAuthStore()
      const result = auth.updateProfile('nobody', { displayName: '????' })
      expect(result.success).toBe(false)
    })

    it('trims empty displayName to undefined', () => {
      const auth = useAuthStore()
      auth.login('student', '123456')
      auth.updateProfile('student', { displayName: '  ' })
      expect(auth.currentUser?.displayName).toBeUndefined()
    })
  })

  // ── Invite Code System ────────────────────────────────────────────────────

  describe('generateInviteCode()', () => {
    it('generates a code and stores it in inviteCodesDb', () => {
      const auth = useAuthStore()
      auth.login('admin', '123456')
      const code = auth.generateInviteCode('student', '愛與話語', 'admin', 7)
      expect(code).toBeTruthy()
      expect(code.length).toBeGreaterThan(4)
      const stored = auth.inviteCodesDb[code]
      expect(stored).toBeDefined()
      expect(stored.role).toBe('student')
      expect(stored.church).toBe('愛與話語')
      expect(stored.revoked).toBe(false)
    })

    it('generates unique codes on successive calls', () => {
      const auth = useAuthStore()
      auth.login('admin', '123456')
      const code1 = auth.generateInviteCode('student', undefined, 'admin', 7)
      const code2 = auth.generateInviteCode('student', undefined, 'admin', 7)
      expect(code1).not.toBe(code2)
    })

    it('generates code without church for admin role', () => {
      const auth = useAuthStore()
      auth.login('admin', '123456')
      const code = auth.generateInviteCode('admin', undefined, 'admin', 30)
      const stored = auth.inviteCodesDb[code]
      expect(stored.church).toBeUndefined()
    })
  })

  describe('validateInviteCode()', () => {
    it('returns the InviteCode object for a valid active code', () => {
      const auth = useAuthStore()
      auth.login('admin', '123456')
      const code = auth.generateInviteCode('teacher', '愛與話語', 'admin', 7)
      const result = auth.validateInviteCode(code)
      expect(result).not.toBeNull()
      expect(result?.role).toBe('teacher')
      expect(result?.church).toBe('愛與話語')
    })

    it('returns null for a non-existent code', () => {
      const auth = useAuthStore()
      const result = auth.validateInviteCode('INVALID-CODE-XYZ')
      expect(result).toBeNull()
    })

    it('returns null for a revoked code', () => {
      const auth = useAuthStore()
      auth.login('admin', '123456')
      const code = auth.generateInviteCode('student', undefined, 'admin', 7)
      auth.revokeInviteCode(code)
      const result = auth.validateInviteCode(code)
      expect(result).toBeNull()
    })

    it('returns null for an already used code', () => {
      const auth = useAuthStore()
      auth.login('admin', '123456')
      const code = auth.generateInviteCode('student', '愛與話語', 'admin', 7)
      auth.consumeInviteCode(code, 'newstudent')
      const result = auth.validateInviteCode(code)
      expect(result).toBeNull()
    })
  })

  describe('consumeInviteCode()', () => {
    it('marks code as used and records the consumer username', () => {
      const auth = useAuthStore()
      auth.login('admin', '123456')
      const code = auth.generateInviteCode('student', '愛與話語', 'admin', 7)
      auth.consumeInviteCode(code, 'newstudent')
      const stored = auth.inviteCodesDb[code]
      expect(stored.usedBy).toBe('newstudent')
      expect(stored.usedAt).toBeTruthy()
    })

    it('does nothing for a non-existent code (no throw)', () => {
      const auth = useAuthStore()
      expect(() => auth.consumeInviteCode('NO-SUCH-CODE', 'someone')).not.toThrow()
    })
  })

  describe('revokeInviteCode()', () => {
    it('marks an active code as revoked', () => {
      const auth = useAuthStore()
      auth.login('admin', '123456')
      const code = auth.generateInviteCode('pastor', undefined, 'admin', 14)
      const result = auth.revokeInviteCode(code)
      expect(result.success).toBe(true)
      const stored = auth.inviteCodesDb[code]
      expect(stored.revoked).toBe(true)
    })

    it('returns failure when code does not exist', () => {
      const auth = useAuthStore()
      const result = auth.revokeInviteCode('FAKE-CODE')
      expect(result.success).toBe(false)
    })

    it('returns failure when code is already used', () => {
      const auth = useAuthStore()
      auth.login('admin', '123456')
      const code = auth.generateInviteCode('student', '愛與話語', 'admin', 7)
      auth.consumeInviteCode(code, 'newstudent')
      const result = auth.revokeInviteCode(code)
      expect(result.success).toBe(false)
    })
  })

  // ── timestamps & legacy migration ─────────────────────────────────────────

  describe('lastLoginAt format', () => {
    const originalTz = process.env.TZ

    afterEach(() => {
      process.env.TZ = originalTz
      vi.useRealTimers()
    })

    it('stores lastLoginAt as ISO 8601', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-28T06:30:00Z'))
      const auth = useAuthStore()
      auth.login('teacher', '123456')
      expect(auth.currentUser?.lastLoginAt).toBe('2026-10-28T06:30:00.000Z')
      expect(auth.usersDb['teacher'].lastLoginAt).toBe('2026-10-28T06:30:00.000Z')
    })

    it('migrates a legacy zh-TW lastLoginAt to ISO on load and persists it', () => {
      process.env.TZ = 'Asia/Taipei'
      localStorage.setItem(
        'superstart_users_db',
        JSON.stringify({
          alice: {
            passwordHash: 'x',
            role: 'student',
            church: '愛與話語',
            lastLoginAt: '2026/10/28 14:30:00'
          }
        })
      )
      localStorage.setItem(
        'superstart_user',
        JSON.stringify({
          username: 'alice',
          role: 'student',
          loginMethod: 'credentials',
          lastLoginAt: '2026/10/28 14:30:00'
        })
      )
      const auth = useAuthStore()
      expect(auth.usersDb['alice'].lastLoginAt).toBe('2026-10-28T06:30:00.000Z')
      expect(auth.currentUser?.lastLoginAt).toBe('2026-10-28T06:30:00.000Z')
      expect(
        JSON.parse(localStorage.getItem('superstart_users_db') || '{}').alice.lastLoginAt
      ).toBe('2026-10-28T06:30:00.000Z')
      expect(JSON.parse(localStorage.getItem('superstart_user') || '{}').lastLoginAt).toBe(
        '2026-10-28T06:30:00.000Z'
      )
    })
  })

  describe('generateInviteCode() uniqueness', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('always produces exactly 4 hex chars', () => {
      const auth = useAuthStore()
      for (let i = 0; i < 50; i++) {
        expect(auth.generateInviteCode('student', '愛與話語', 'admin')).toMatch(
          /^SS-STU-[0-9A-F]{4}$/
        )
      }
    })

    it('regenerates when the random part collides with an existing code', () => {
      const auth = useAuthStore()
      // First two draws produce 0xABCD, the third 0x1234
      const draws = [
        [0xab, 0xcd],
        [0xab, 0xcd],
        [0x12, 0x34]
      ]
      vi.spyOn(crypto, 'getRandomValues').mockImplementation((arr) => {
        ;(arr as unknown as Uint8Array).set(draws.shift() ?? [0, 0])
        return arr
      })
      expect(auth.generateInviteCode('student', '愛與話語', 'admin')).toBe('SS-STU-ABCD')
      expect(auth.generateInviteCode('student', '愛與話語', 'admin')).toBe('SS-STU-1234')
      expect(Object.keys(auth.inviteCodesDb)).toHaveLength(2)
    })
  })

  // ── session changes from another tab ──────────────────────────────────────

  describe('session changes from another tab', () => {
    const otherTabWrites = (key: string, value: unknown) =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key,
          newValue: value === null ? null : JSON.stringify(value)
        })
      )

    it('signs out when another tab signs out, and later sign-ins still persist', async () => {
      const auth = useAuthStore()
      auth.login('student', '123456')
      await nextTick()

      localStorage.removeItem('superstart_user') // what the other tab's logout did
      otherTabWrites('superstart_user', null)
      await nextTick()
      expect(auth.currentUser).toBeNull()
      expect(auth.sessionChangedElsewhere).toBe(1)

      auth.login('teacher', '123456')
      await nextTick()
      expect(auth.sessionChangedElsewhere).toBe(1) // local sign-ins don't count
      expect(JSON.parse(localStorage.getItem('superstart_user') || 'null')?.username).toBe(
        'teacher'
      )
    })

    it('follows a sign-in made in another tab', async () => {
      const auth = useAuthStore()
      otherTabWrites('superstart_user', {
        username: 'admin',
        role: 'admin',
        loginMethod: 'credentials'
      })
      await nextTick()
      expect(auth.currentUser?.username).toBe('admin')
    })
  })

  // ── parent ↔ child bindings ─────────────────────────────────────────────────

  describe('parent bindings', () => {
    it('binds and unbinds children on the parent account', () => {
      const auth = useAuthStore()
      auth.usersDb.mom = { passwordHash: 'x', role: 'parent', church: '愛與話語' }
      auth.usersDb.s2 = { passwordHash: 'x', role: 'student', church: '愛與話語' }

      auth.bindChild('mom', 's2')
      auth.bindChild('mom', 's2') // no duplicates
      auth.bindChild('parent', 's2')
      expect(auth.childrenOf('mom')).toEqual(['s2'])
      expect(auth.parentsOf('s2')).toEqual(['parent', 'mom'])

      auth.unbindChild('mom', 's2')
      expect(auth.parentsOf('s2')).toEqual(['parent'])

      auth.unbindChildEverywhere('s2')
      expect(auth.parentsOf('s2')).toEqual([])
      expect(auth.childrenOf('parent')).toEqual(['student'])
    })

    it('ignores accounts that are not parents', () => {
      const auth = useAuthStore()
      auth.bindChild('teacher', 'student')
      expect(auth.usersDb.teacher.childUsernames).toBeUndefined()
      expect(auth.childrenOf('teacher')).toEqual([])
      expect(auth.parentsOf('student')).toEqual(['parent'])
    })
  })

  describe('displayNameOf()', () => {
    it('prefers the real name, then the nickname, then the username', () => {
      const auth = useAuthStore()
      auth.usersDb.teacher.realName = '王老師'
      auth.usersDb.teacher.displayName = '阿王'
      auth.usersDb.pastor.displayName = '李牧'
      expect(auth.displayNameOf('teacher')).toBe('王老師')
      expect(auth.displayNameOf('pastor')).toBe('李牧')
      expect(auth.displayNameOf('parent')).toBe('parent')
      expect(auth.displayNameOf('ghost')).toBe('ghost')
    })
  })

  describe('gender', () => {
    it('is set and cleared on teachers and students only', () => {
      const auth = useAuthStore()
      auth.setGender('student', 'female')
      auth.setGender('teacher', 'male')
      expect(auth.usersDb.student.gender).toBe('female')
      expect(auth.usersDb.teacher.gender).toBe('male')

      auth.setGender('student', undefined)
      expect('gender' in auth.usersDb.student).toBe(false)

      for (const other of ['parent', 'pastor', 'admin', 'nobody']) {
        auth.setGender(other, 'male')
        expect(auth.usersDb[other]?.gender).toBeUndefined()
        expect(auth.hasGender(other)).toBe(false)
      }
    })

    it('is saved with the accounts', async () => {
      vi.useFakeTimers()
      const auth = useAuthStore()
      auth.setGender('teacher', 'female')
      await nextTick()
      vi.runAllTimers()
      expect(JSON.parse(localStorage.getItem('superstart_users_db')!).teacher.gender).toBe('female')
      vi.useRealTimers()
    })
  })

  describe('social sign-in accounts', () => {
    const google = (username = 'oauth_1') => ({
      username,
      role: 'student' as const,
      loginMethod: 'google' as const,
      displayName: 'Google 使用者',
      email: 'g@example.com'
    })

    it('keeps a record once onboarding sets the church, without a password', async () => {
      const auth = useAuthStore()
      auth.currentUser = google()
      expect(auth.usersDb.oauth_1).toBeUndefined()

      const result = await auth.completeProfile({ churchId: '愛與話語', username: 'amy' })
      expect(result.success).toBe(true)
      expect(auth.currentUser?.username).toBe('amy')
      expect(auth.usersDb.amy).toMatchObject({
        passwordHash: '',
        role: 'student',
        church: '愛與話語',
        loginMethod: 'google',
        displayName: 'Google 使用者',
        email: 'g@example.com'
      })
      expect(auth.usersDb.oauth_1).toBeUndefined()

      // ...so staff can manage them and they can edit their profile
      auth.setGender('amy', 'female')
      expect(auth.usersDb.amy.gender).toBe('female')
      expect(auth.updateProfile('amy', { realName: '王小美' }).success).toBe(true)
    })

    it("binds a parent's chosen children, only students of their church", async () => {
      const auth = useAuthStore()
      auth.usersDb.s2 = { passwordHash: 'x', role: 'student', church: '愛與話語' }
      auth.usersDb.far = { passwordHash: 'x', role: 'student', church: '主大明' }
      const code = auth.generateInviteCode('parent', '愛與話語', 'admin')
      auth.currentUser = google()
      await auth.completeProfile({
        churchId: '愛與話語',
        username: 'dad',
        inviteCode: code,
        childUsernames: ['student', 's2', 'far', 'teacher', 'ghost']
      })
      expect(auth.childrenOf('dad')).toEqual(['student', 's2'])
      expect(auth.currentUser?.childUsernames).toEqual(['student', 's2'])
      expect(auth.parentsOf('student')).toContain('dad')
    })

    it('binds no children for anyone but a parent', async () => {
      const auth = useAuthStore()
      auth.currentUser = google()
      await auth.completeProfile({ churchId: '愛與話語', childUsernames: ['student'] })
      expect(auth.parentsOf('student')).not.toContain('oauth_1')
      expect(auth.usersDb.oauth_1.childUsernames).toBeUndefined()
      expect(auth.currentUser?.childUsernames).toBeUndefined()
    })

    it('records the role an invite code gives', async () => {
      const auth = useAuthStore()
      const code = auth.generateInviteCode('teacher', '愛與話語', 'admin')
      auth.currentUser = google()
      await auth.completeProfile({ churchId: '愛與話語', inviteCode: code })
      expect(auth.usersDb.oauth_1).toMatchObject({ role: 'teacher', church: '愛與話語' })
    })

    it('refuses a username that is already taken', async () => {
      const auth = useAuthStore()
      auth.currentUser = google()
      const result = await auth.completeProfile({ churchId: '愛與話語', username: 'teacher' })
      expect(result).toEqual({ success: false, message: t('stores.auth.usernameTaken') })
      expect(auth.currentUser?.username).toBe('oauth_1')
      expect(auth.usersDb.teacher.role).toBe('teacher')
    })

    it('cannot be signed in to with a password', async () => {
      const auth = useAuthStore()
      auth.currentUser = google()
      await auth.completeProfile({ churchId: '愛與話語' })
      auth.logout()
      expect(auth.login('oauth_1', '')).toEqual({
        success: false,
        message: t('stores.auth.useSocialLogin')
      })
      expect(auth.currentUser).toBeNull()
    })

    it('adds a record for a social user who onboarded before records were kept', () => {
      localStorage.setItem('superstart_user', JSON.stringify({ ...google(), church: '愛與話語' }))
      expect(useAuthStore().usersDb.oauth_1).toMatchObject({ church: '愛與話語', role: 'student' })

      setActivePinia(createPinia())
      localStorage.clear()
      localStorage.setItem('superstart_user', JSON.stringify(google('oauth_2'))) // still onboarding
      expect(useAuthStore().usersDb.oauth_2).toBeUndefined()
    })
  })
})
