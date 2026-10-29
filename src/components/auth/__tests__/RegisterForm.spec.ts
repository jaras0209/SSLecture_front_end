import { describe, it, expect, afterEach, vi } from 'vitest'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import { useAuthStore } from '@/stores/auth'
import { mountWith, toastTexts, t } from '@/__tests__/helpers'

const STRONG = 'Abcdef1!'

async function fill(
  wrapper: ReturnType<typeof mountWith>['wrapper'],
  username: string,
  pwd: string
) {
  await wrapper.find('#reg-username').setValue(username)
  await wrapper.find('#reg-password').setValue(pwd)
}

describe('RegisterForm', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects empty fields and weak passwords', async () => {
    const { wrapper } = mountWith(RegisterForm)
    await wrapper.find('form').trigger('submit')
    expect(toastTexts()).toEqual([t('auth.validation.fillAll')])

    await fill(wrapper, 'newbie', 'abcdef')
    await wrapper.find('form').trigger('submit')
    expect(toastTexts().at(-1)).toBe(t('auth.validation.pwdTooWeak'))
    expect(useAuthStore().usersDb.newbie).toBeUndefined()
  })

  it('shows the password strength meter while typing', async () => {
    const { wrapper } = mountWith(RegisterForm)
    expect(wrapper.find('.pwd-strength-section').exists()).toBe(false)
    await wrapper.find('#reg-password').setValue(STRONG)
    expect(wrapper.find('.pwd-strength-label').text()).toBe(t('passwordStrength.strong'))
    expect(wrapper.findAll('.pwd-bar.bar-strong')).toHaveLength(3)
  })

  it('registers a student without an invite code and goes home', async () => {
    vi.useFakeTimers()
    const { wrapper, router } = mountWith(RegisterForm)
    const push = vi.spyOn(router, 'push')
    await fill(wrapper, 'newbie', STRONG)
    await wrapper.find('form').trigger('submit')

    const auth = useAuthStore()
    expect(auth.usersDb.newbie).toMatchObject({ role: 'student' })
    expect(auth.currentUser?.username).toBe('newbie')
    vi.advanceTimersByTime(500)
    expect(push).toHaveBeenCalledWith('/')
  })

  it('validates invite codes as they are typed', async () => {
    const { wrapper } = mountWith(RegisterForm)
    const auth = useAuthStore()
    const code = auth.generateInviteCode('teacher', '愛與話語', 'admin', 7)
    const input = wrapper.find('#reg-invite-code')

    await input.setValue('SS-T') // too short to check yet
    expect(wrapper.find('.invite-badge').exists()).toBe(false)

    await input.setValue('SS-TCH-0000')
    expect(wrapper.find('.invite-badge.invalid').exists()).toBe(true)

    await input.setValue(code.toLowerCase()) // case-insensitive
    expect(wrapper.find('.invite-badge.valid').exists()).toBe(true)
    expect(wrapper.find('.invite-tag.role-tag').text()).toBe(t('roleLabel.teacher'))
  })

  it('uses the invite code role and marks the code as used', async () => {
    const { wrapper } = mountWith(RegisterForm)
    const auth = useAuthStore()
    const code = auth.generateInviteCode('teacher', '愛與話語', 'admin', 7)
    await wrapper.find('#reg-invite-code').setValue(code)
    await fill(wrapper, 'newteacher', STRONG)
    await wrapper.find('form').trigger('submit')

    expect(auth.usersDb.newteacher).toMatchObject({ role: 'teacher', church: '愛與話語' })
    expect(auth.validateInviteCode(code)).toBeNull()
    expect(auth.getInviteCodes().find((c) => c.code === code)?.usedBy).toBe('newteacher')
  })

  it('requires a parent to bind at least one student', async () => {
    const { wrapper } = mountWith(RegisterForm)
    const auth = useAuthStore()
    const code = auth.generateInviteCode('parent', '愛與話語', 'admin', 7)
    await wrapper.find('#reg-invite-code').setValue(code)
    await fill(wrapper, 'mom', STRONG)

    await wrapper.find('form').trigger('submit')
    expect(toastTexts().at(-1)).toBe(t('auth.validation.parentBindStudent'))
    expect(auth.usersDb.mom).toBeUndefined()

    await wrapper.find('.student-binding-option input').setValue(true)
    await wrapper.find('form').trigger('submit')
    expect(auth.usersDb.mom).toMatchObject({ role: 'parent', childUsernames: ['student'] })
  })
})
