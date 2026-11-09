import { describe, it, expect, afterEach, vi } from 'vitest'
import { DOMWrapper } from '@vue/test-utils'
import ProfileDialog from '@/components/shared/ProfileDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { dicebearAvatarUrl } from '@/utils/avatar'
import { mountWith, t } from '@/__tests__/helpers'

const $ = (sel: string) => new DOMWrapper(document.body).find(sel)
const $$ = (sel: string) => new DOMWrapper(document.body).findAll(sel)
const value = (sel: string) => ($(sel).element as HTMLInputElement).value

/** Mount closed as `student`, then open it (the dialog loads its drafts when it opens) */
async function openAsStudent() {
  const result = mountWith(ProfileDialog, { props: { modelValue: false }, attachTo: document.body })
  const auth = useAuthStore()
  auth.currentUser = {
    username: 'student',
    role: 'student',
    loginMethod: 'credentials',
    church: '愛與話語',
    displayName: '小明',
    realName: '王小明'
  }
  await result.wrapper.setProps({ modelValue: true })
  return { ...result, auth }
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('ProfileDialog', () => {
  it('loads the current profile when it opens', async () => {
    const { wrapper } = await openAsStudent()
    expect(value('#pd-nickname')).toBe('小明')
    expect(value('#pd-realname')).toBe('王小明')
    expect($('.pd-info-item').text()).toContain('student')
    wrapper.unmount()
  })

  it('saves the names and the chosen avatar style, then closes', async () => {
    vi.useFakeTimers()
    const { wrapper, auth } = await openAsStudent()
    await $('#pd-nickname').setValue('  明明  ')
    await $$('.pd-preset-btn')[2].trigger('click') // bottts
    expect($$('.pd-preset-btn')[2].classes()).toContain('active')
    await $$('.pd-footer-btns button')[1].trigger('click')

    expect(auth.currentUser).toMatchObject({
      displayName: '明明',
      realName: '王小明',
      avatarUrl: dicebearAvatarUrl('bottts', 'student')
    })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    vi.advanceTimersByTime(1200)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })

  it('saves an email, but keeps the dialog open to fix one already in use', async () => {
    vi.useFakeTimers()
    const { wrapper, auth } = await openAsStudent()
    auth.usersDb.teacher.email = 'taken@church.org'
    const save = () => $$('.pd-footer-btns button')[1].trigger('click')

    await $('#pd-email').setValue('Taken@church.org')
    await save()
    expect($('.save-status').text()).toBe(t('account.emailTaken'))
    expect($('.save-status').classes()).toContain('save-error')
    vi.advanceTimersByTime(2000)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect($('.save-status').exists()).toBe(true)

    await $('#pd-email').setValue(' Kid@Church.org ')
    await save()
    expect(auth.usersDb.student.email).toBe('kid@church.org')
    vi.advanceTimersByTime(1200)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })

  it('uses a custom avatar URL instead of a preset', async () => {
    const { wrapper, auth } = await openAsStudent()
    await $$('.pd-preset-btn')[1].trigger('click')
    await $('.pd-custom-url-row input').setValue('https://example.com/me.png')
    expect($$('.pd-preset-btn.active')).toHaveLength(0)
    await $$('.pd-footer-btns button')[1].trigger('click')
    expect(auth.currentUser?.avatarUrl).toBe('https://example.com/me.png')
    wrapper.unmount()
  })

  it('says why an avatar address is refused, and keeps the current avatar', async () => {
    const { wrapper, auth } = await openAsStudent()
    const input = $('.pd-custom-url-row input')
    await input.setValue('http://tracker.example/pixel.gif')
    expect($('#pd-avatar-url-error').text()).toBe(t('profile.avatarUrlInvalid'))
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe('pd-avatar-url-error')
    await $$('.pd-footer-btns button')[1].trigger('click')
    expect(auth.currentUser?.avatarUrl).not.toContain('tracker.example')

    await input.setValue('https://example.com/me.png')
    expect($('#pd-avatar-url-error').exists()).toBe(false)
    wrapper.unmount()
  })

  it('validates and changes the password', async () => {
    const { wrapper, auth } = await openAsStudent()
    await $('.pd-pwd-toggle').trigger('click')
    const submit = () => $('.pd-pwd-form form').trigger('submit')
    const alert = () => $('.pd-pwd-form .alert-box')

    await submit()
    expect(alert().text()).toBe(t('profile.errFillAll'))

    await $('#pd-pwd-old').setValue('123456')
    await $('#pd-pwd-new').setValue('Abcdef1!')
    await $('#pd-pwd-confirm').setValue('Abcdef1?')
    await submit()
    expect(alert().text()).toBe(t('profile.errMismatch'))

    await $('#pd-pwd-new').setValue('abcdef')
    await $('#pd-pwd-confirm').setValue('abcdef')
    await submit()
    expect(alert().text()).toBe(t('auth.passwordRules.tooWeak'))

    // the same rules as everywhere else a password is changed
    await $('#pd-pwd-old').setValue('Abcdef1!')
    await $('#pd-pwd-new').setValue('Abcdef1!')
    await $('#pd-pwd-confirm').setValue('Abcdef1!')
    await submit()
    expect(alert().text()).toBe(t('changePassword.errSame'))

    await $('#pd-pwd-old').setValue('wrong')
    await $('#pd-pwd-new').setValue('Abcdef1!')
    await $('#pd-pwd-confirm').setValue('Abcdef1!')
    await submit()
    expect(alert().classes()).toContain('error')
    expect(auth.usersDb.student.passwordHash).toBe('123456')

    await $('#pd-pwd-old').setValue('123456')
    await submit()
    expect(alert().classes()).toContain('success')
    expect(auth.usersDb.student.passwordHash).toBe('Abcdef1!')
    expect(value('#pd-pwd-old')).toBe('') // cleared
    wrapper.unmount()
  })

  it('closes from the close and cancel buttons without saving', async () => {
    const { wrapper, auth } = await openAsStudent()
    await $('#pd-nickname').setValue('改了')
    await $('.pd-close').trigger('click')
    await $$('.pd-footer-btns button')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [false]])
    expect(auth.currentUser?.displayName).toBe('小明')
    wrapper.unmount()
  })
})
