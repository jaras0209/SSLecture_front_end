/**
 * The pages with the backend (VITE_DEMO_MODE=false and VITE_API_BASE_URL set): they call the
 * store's backend actions and show what those answer. The actions themselves are tested against
 * a fake server in stores/__tests__/authBackend.spec.ts and adminBackend.spec.ts.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { mountPrepared, mountWith, toastTexts, t } from '@/__tests__/helpers'
import { useAuthStore } from '@/stores/auth'
import { resolveConfirm, useToastProvider } from '@/composables/useToast'
import LoginForm from '@/components/auth/LoginForm.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import PasswordChangeForm from '@/components/shared/PasswordChangeForm.vue'
import ProfileDialog from '@/components/shared/ProfileDialog.vue'
import GenderSelect from '@/components/shared/GenderSelect.vue'
import AdminUserTable from '@/components/admin/AdminUserTable.vue'
import AdminCreateUserPanel from '@/components/admin/AdminCreateUserPanel.vue'
import AdminInviteCodes from '@/components/admin/AdminInviteCodes.vue'
import AdminDashboard from '@/views/AdminDashboard.vue'
import App from '@/App.vue'
import router from '@/router'
import i18n from '@/i18n'

const ADMIN = { username: 'admin', role: 'admin', loginMethod: 'credentials' } as const
const STUDENT = { username: 'student', role: 'student', loginMethod: 'credentials' } as const
const done = (message = 'ok') => Promise.resolve({ success: true, message })
const refused = (message: string) => Promise.resolve({ success: false, message })

beforeEach(() => {
  vi.stubEnv('VITE_DEMO_MODE', 'false')
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('signing in and registering with the backend', () => {
  it('the login form asks the server, then goes home', async () => {
    const { wrapper, router } = mountWith(LoginForm, {
      props: { username: 'student', password: '123456' }
    })
    const auth = useAuthStore()
    const signIn = vi.spyOn(auth, 'signIn').mockImplementation(async () => {
      auth.currentUser = { ...STUDENT }
      return { success: true, message: '登入成功！' }
    })
    vi.useFakeTimers()
    const push = vi.spyOn(router, 'push')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(signIn).toHaveBeenCalledWith('student', '123456', false)
    expect(toastTexts()).toContain('登入成功！')
    vi.advanceTimersByTime(500)
    expect(push).toHaveBeenCalled()
  })

  it("the login form shows the server's refusal", async () => {
    const { wrapper } = mountWith(LoginForm, { props: { username: 'student', password: 'x' } })
    vi.spyOn(useAuthStore(), 'signIn').mockReturnValue(refused('帳號或密碼錯誤'))
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(toastTexts()).toContain('帳號或密碼錯誤')
  })

  it('registering sends the invite code for the server to check', async () => {
    const { wrapper } = mountWith(RegisterForm)
    const auth = useAuthStore()
    const signUp = vi.spyOn(auth, 'signUp').mockImplementation(async () => {
      auth.currentUser = { username: 'new.teacher', role: 'teacher', loginMethod: 'credentials' }
      return { success: true, message: '註冊成功！' }
    })
    await wrapper.find('#reg-invite-code').setValue('ss-tch-abcd2345')
    await wrapper.find('#reg-invite-code').trigger('input')
    // Not checked here: the server sets the role and church
    expect(wrapper.text()).toContain(t('auth.register.inviteCheckedOnSubmit'))
    expect(wrapper.text()).toContain(t('auth.register.roleFromInvite'))
    await wrapper.find('#reg-username').setValue('new.teacher')
    await wrapper.find('#reg-password').setValue('Abc123!x')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'new.teacher', inviteCode: 'SS-TCH-ABCD2345' })
    )
    expect(toastTexts()).toContain('註冊成功！')
  })

  it("registering shows the server's refusal", async () => {
    const { wrapper } = mountWith(RegisterForm)
    vi.spyOn(useAuthStore(), 'signUp').mockReturnValue(refused('邀請碼無效'))
    await wrapper.find('#reg-username').setValue('someone')
    await wrapper.find('#reg-password').setValue('Abc123!x')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(toastTexts()).toContain('邀請碼無效')
  })
})

describe('own account with the backend', () => {
  it('the password form changes the password on the server', async () => {
    const { wrapper } = mountPrepared(PasswordChangeForm, () => {
      useAuthStore().currentUser = { ...STUDENT }
    })
    const change = vi
      .spyOn(useAuthStore(), 'changeOwnPassword')
      .mockReturnValue(done(t('stores.auth.passwordChanged')))
    const inputs = wrapper.findAll('input.form-input')
    await inputs[0].setValue('123456')
    await inputs[1].setValue('Abc123!x')
    await inputs[2].setValue('Abc123!x')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(change).toHaveBeenCalledWith('123456', 'Abc123!x')
    expect(wrapper.text()).toContain(t('stores.auth.passwordChanged'))
  })

  it('the profile dialog saves on the server', async () => {
    const result = mountWith(ProfileDialog, {
      props: { modelValue: false },
      attachTo: document.body
    })
    const auth = useAuthStore()
    auth.currentUser = { ...STUDENT, displayName: '小明' }
    await result.wrapper.setProps({ modelValue: true })
    const save = vi.spyOn(auth, 'saveProfile').mockReturnValue(refused('信箱已被其他帳號使用'))
    const button = [...document.body.querySelectorAll('button')].find((b) =>
      b.textContent?.includes(t('common.save'))
    )!
    button.click()
    await flushPromises()
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ displayName: '小明' }))
    expect(document.body.textContent).toContain('信箱已被其他帳號使用')
    result.wrapper.unmount()
  })
})

describe('admin pages with the backend', () => {
  function signInAdmin() {
    useAuthStore().currentUser = { ...ADMIN }
  }

  const row = (wrapper: ReturnType<typeof mountWith>['wrapper'], username: string) =>
    wrapper.findAll('tbody tr').find((tr) => tr.find('.username-cell').text().includes(username))!

  it('the dashboard loads accounts and invite codes from the server', async () => {
    let loaded = 0
    const { wrapper } = mountPrepared(AdminDashboard, () => {
      signInAdmin()
      const store = useAuthStore()
      vi.spyOn(store, 'loadAccounts').mockImplementation(() => {
        loaded++
        return done('')
      })
      vi.spyOn(store, 'loadInviteCodes').mockReturnValue(refused('沒有權限'))
    })
    await flushPromises()
    expect(loaded).toBe(1)
    expect(toastTexts()).toContain('沒有權限')
    wrapper.unmount()
  })

  it('changing a role goes to the server, which says what it cleaned up', async () => {
    const { wrapper } = mountPrepared(AdminUserTable, signInAdmin)
    const auth = useAuthStore()
    const update = vi.spyOn(auth, 'adminUpdateAccount').mockResolvedValue({
      success: true,
      message: '',
      cleanup: { mentorAssignments: 2, lecturerLinks: 0, cancelledBookings: 1 }
    })
    await row(wrapper, 'teacher').find('select').setValue('pastor')
    await flushPromises()
    expect(update).toHaveBeenCalledWith('teacher', { role: 'pastor' })
    expect(toastTexts()).toContain(
      t('admin.cleanup.summary', { mentors: 2, lecturers: 0, bookings: 1 })
    )
  })

  it('a refused role change shows why and reloads the accounts', async () => {
    const { wrapper } = mountPrepared(AdminUserTable, signInAdmin)
    const auth = useAuthStore()
    vi.spyOn(auth, 'adminUpdateAccount').mockReturnValue(refused('找不到此使用者'))
    const reload = vi.spyOn(auth, 'loadAccounts').mockReturnValue(done(''))
    await row(wrapper, 'teacher').find('select').setValue('pastor')
    await flushPromises()
    expect(toastTexts()).toContain('找不到此使用者')
    expect(reload).toHaveBeenCalled()
  })

  it('deleting goes to the server', async () => {
    const { wrapper } = mountPrepared(AdminUserTable, signInAdmin)
    const auth = useAuthStore()
    const remove = vi.spyOn(auth, 'adminDeleteAccount').mockResolvedValue({
      success: true,
      message: '',
      cleanup: { mentorAssignments: 0, lecturerLinks: 1, cancelledBookings: 0 }
    })
    await row(wrapper, 'pastor').find('.delete-btn').trigger('click')
    resolveConfirm(true)
    await flushPromises()
    expect(remove).toHaveBeenCalledWith('pastor')
    expect(toastTexts()).toContain(t('admin.userList.deletedToast', { username: 'pastor' }))

    vi.spyOn(auth, 'adminDeleteAccount').mockReturnValue(refused('不能刪除'))
    await row(wrapper, 'parent').find('.delete-btn').trigger('click')
    resolveConfirm(true)
    await flushPromises()
    expect(toastTexts()).toContain('不能刪除')
  })

  it('resetting a password shows the temporary one from the server', async () => {
    const { wrapper } = mountPrepared(AdminUserTable, signInAdmin)
    vi.spyOn(useAuthStore(), 'adminResetPasswordOnServer').mockResolvedValue({
      success: true,
      message: '',
      password: 'Temp7Pass9'
    })
    const resetButton = row(wrapper, 'student')
      .findAll('button')
      .find((b) => b.text().includes('🔑'))!
    await resetButton.trigger('click')
    resolveConfirm(true)
    await flushPromises()
    expect(wrapper.find('.temp-password').text()).toBe('Temp7Pass9')
  })

  it('creating an account goes to the server', async () => {
    const { wrapper } = mountPrepared(AdminCreateUserPanel, signInAdmin)
    const create = vi
      .spyOn(useAuthStore(), 'adminCreateAccount')
      .mockResolvedValue({ success: true, message: '', username: 'new.one' })
    await wrapper.find('#new-username').setValue('new.one')
    await wrapper.find('#new-password').setValue('Temp-123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ username: 'new.one' }))
    expect(wrapper.text()).toContain(t('admin.createUser.successMsg', { username: 'new.one' }))
  })

  it('invite codes are made and revoked on the server', async () => {
    const { wrapper } = mountPrepared(AdminInviteCodes, signInAdmin)
    const auth = useAuthStore()
    const generate = vi
      .spyOn(auth, 'adminGenerateInviteCode')
      .mockResolvedValue({ success: true, message: '', code: 'SS-TCH-ABCD2345' })
    await wrapper.find('#btn-generate-invite').trigger('click')
    await flushPromises()
    expect(generate).toHaveBeenCalledWith('teacher', '愛與話語', 7)
    expect(toastTexts()).toContain(t('admin.inviteCode.generated', { code: 'SS-TCH-ABCD2345' }))

    vi.spyOn(auth, 'adminGenerateInviteCode').mockReturnValue(refused('請選擇所屬教會'))
    await wrapper.find('#btn-generate-invite').trigger('click')
    await flushPromises()
    expect(toastTexts()).toContain('請選擇所屬教會')

    auth.inviteCodesDb['SS-STU-WXYZ6789'] = {
      code: 'SS-STU-WXYZ6789',
      role: 'student',
      church: '愛與話語',
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      revoked: false
    }
    await flushPromises()
    const revoke = vi.spyOn(auth, 'adminRevokeInviteCode').mockReturnValue(done('已作廢'))
    const revokeButton = wrapper
      .findAll('button')
      .find(
        (b) => b.attributes('aria-label')?.includes('SS-STU-WXYZ6789') || b.text().includes('作廢')
      )!
    await revokeButton.trigger('click')
    resolveConfirm(true)
    await flushPromises()
    expect(revoke).toHaveBeenCalledWith('SS-STU-WXYZ6789')
  })

  it('an admin sets a gender on the server; others still set it here', async () => {
    const { wrapper } = mountPrepared(GenderSelect, signInAdmin, { props: { username: 'student' } })
    const auth = useAuthStore()
    const update = vi
      .spyOn(auth, 'adminUpdateAccount')
      .mockReturnValue(refused('只有學員與教師需要設定性別'))
    await wrapper.find('select').setValue('female')
    await flushPromises()
    expect(update).toHaveBeenCalledWith('student', { gender: 'female' })
    expect(toastTexts()).toContain('只有學員與教師需要設定性別')

    auth.currentUser = { username: 'pastor', role: 'pastor', loginMethod: 'credentials' }
    await wrapper.find('select').setValue('male')
    expect(auth.usersDb.student.gender).toBe('male')
  })
})

describe('the app with the backend', () => {
  it('returns to the login page and says why when the server ends the sign-in', async () => {
    localStorage.clear()
    localStorage.setItem('superstart_access_token', JSON.stringify('old'))
    localStorage.setItem('superstart_refresh_token', JSON.stringify('old-refresh'))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/auth/refresh')
          ? new Response(
              JSON.stringify({ success: false, error: { code: 'REFRESH_TOKEN_EXPIRED' } }),
              { status: 401 }
            )
          : new Response(JSON.stringify({ success: false, error: { code: 'TOKEN_EXPIRED' } }), {
              status: 401
            })
      )
    )
    const pinia = createPinia()
    setActivePinia(pinia)
    useToastProvider().toasts.value = []
    useAuthStore().currentUser = { ...STUDENT }
    await router.replace('/')
    const wrapper = mount(App, {
      global: { plugins: [pinia, router, i18n], stubs: { RouterView: true } },
      attachTo: document.body
    })
    await flushPromises()
    expect(useAuthStore().currentUser).toBeNull()
    // The login page loads on demand, so the navigation finishes a little later
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/login'))
    expect(sessionStorage.getItem('superstart_signout_reason')).toBe(JSON.stringify('expired'))
    wrapper.unmount()
  })
})
