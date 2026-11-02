import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// Uses the real router and guard (not a copy of its logic)
describe('router: a password an admin set must be replaced first', () => {
  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    await router.replace('/login')
  })

  it('sends someone with an admin-set password to change it, wherever they go', async () => {
    const auth = useAuthStore()
    auth.usersDb.newkid = {
      passwordHash: 'first',
      role: 'student',
      church: '愛與話語',
      mustChangePassword: true
    }
    auth.login('newkid', 'first')

    for (const path of ['/', '/student', '/teacher', '/onboarding']) {
      await router.push(path)
      expect(router.currentRoute.value.name, path).toBe('ChangePassword')
    }

    auth.updatePassword('newkid', 'first', 'Better#2026')
    await router.push('/student')
    expect(router.currentRoute.value.path).toBe('/student')
  })

  it('leaves everyone else alone', async () => {
    useAuthStore().login('student', '123456')
    await router.push('/student')
    expect(router.currentRoute.value.path).toBe('/student')
  })
})
