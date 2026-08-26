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
})
