import { describe, it, expect } from 'vitest'
import ChangePasswordView from '@/views/ChangePasswordView.vue'
import { useAuthStore } from '@/stores/auth'
import { mountPrepared, toastTexts, t } from '@/__tests__/helpers'

function mountForNewKid() {
  return mountPrepared(ChangePasswordView, () => {
    const auth = useAuthStore()
    auth.usersDb.newkid = {
      passwordHash: 'first',
      role: 'student',
      church: '愛與話語',
      mustChangePassword: true
    }
    auth.login('newkid', 'first')
  })
}

type Wrapper = ReturnType<typeof mountForNewKid>['wrapper']

async function fill(wrapper: Wrapper, old: string, new1: string, new2 = new1) {
  await wrapper.find('#cp-old').setValue(old)
  await wrapper.find('#cp-new').setValue(new1)
  await wrapper.find('#cp-confirm').setValue(new2)
  await wrapper.find('form').trigger('submit')
}

const error = (wrapper: Wrapper) => wrapper.find('.alert-box.error').text()

describe('ChangePasswordView', () => {
  it('checks the new password before changing it', async () => {
    const { wrapper } = mountForNewKid()
    await fill(wrapper, '', '')
    expect(error(wrapper)).toBe(t('profile.errFillAll'))
    await fill(wrapper, 'first', 'Better#2026', 'Better#2027')
    expect(error(wrapper)).toBe(t('profile.errMismatch'))
    await fill(wrapper, 'first', 'abc')
    expect(error(wrapper)).toBe(t('auth.passwordRules.tooWeak'))
    await fill(wrapper, 'Better#2026', 'Better#2026')
    expect(error(wrapper)).toBe(t('changePassword.errSame'))
    await fill(wrapper, 'wrong', 'Better#2026')
    expect(error(wrapper)).toBe(t('stores.auth.wrongOldPassword'))
    expect(useAuthStore().currentUser?.mustChangePassword).toBe(true)
  })

  it('changes it and goes home', async () => {
    const { wrapper, router } = mountForNewKid()
    await fill(wrapper, 'first', 'Better#2026')
    const auth = useAuthStore()
    expect(auth.usersDb.newkid.passwordHash).toBe('Better#2026')
    expect(auth.currentUser?.mustChangePassword).toBeUndefined()
    expect(toastTexts().at(-1)).toBe(t('stores.auth.passwordChanged'))
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/student')
  })

  it('can sign out instead', async () => {
    const { wrapper, router } = mountForNewKid()
    await wrapper.findAll('button[type="button"]').at(-1)!.trigger('click')
    expect(useAuthStore().isAuthenticated).toBe(false)
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
