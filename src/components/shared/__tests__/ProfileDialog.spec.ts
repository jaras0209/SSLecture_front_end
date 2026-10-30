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

  it('uses a custom avatar URL instead of a preset', async () => {
    const { wrapper, auth } = await openAsStudent()
    await $$('.pd-preset-btn')[1].trigger('click')
    await $('.pd-custom-url-row input').setValue('https://example.com/me.png')
    expect($$('.pd-preset-btn.active')).toHaveLength(0)
    await $$('.pd-footer-btns button')[1].trigger('click')
    expect(auth.currentUser?.avatarUrl).toBe('https://example.com/me.png')
    wrapper.unmount()
  })

  it('validates and changes the password', async () => {
    const { wrapper, auth } = await openAsStudent()
    await $('.pd-pwd-toggle').trigger('click')
    const submit = () => $('.pd-pwd-form .save-row button').trigger('click')
    const alert = () => $('.pd-pwd-alert')

    await submit()
    expect(alert().text()).toBe(t('profile.errFillAll'))

    await $('#pd-old-pwd').setValue('123456')
    await $('#pd-new-pwd').setValue('Abcdef1!')
    await $('#pd-confirm-pwd').setValue('Abcdef1?')
    await submit()
    expect(alert().text()).toBe(t('profile.errMismatch'))

    await $('#pd-new-pwd').setValue('abcdef')
    await $('#pd-confirm-pwd').setValue('abcdef')
    await submit()
    expect(alert().text()).toBe(t('profile.errWeak'))

    await $('#pd-old-pwd').setValue('wrong')
    await $('#pd-new-pwd').setValue('Abcdef1!')
    await $('#pd-confirm-pwd').setValue('Abcdef1!')
    await submit()
    expect(alert().classes()).toContain('error')
    expect(auth.usersDb.student.passwordHash).toBe('123456')

    await $('#pd-old-pwd').setValue('123456')
    await submit()
    expect(alert().classes()).toContain('success')
    expect(auth.usersDb.student.passwordHash).toBe('Abcdef1!')
    expect(value('#pd-old-pwd')).toBe('') // cleared
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
