import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

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
      expect(result.message).toBeTruthy()  // message is i18n-translated; locale depends on test env
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
})
