import { describe, it, expect, afterEach, vi } from 'vitest'
import LoginForm from '@/components/auth/LoginForm.vue'
import { useAuthStore } from '@/stores/auth'
import { mountWith, toastTexts, t } from '@/__tests__/helpers'
import { sessionMeta } from '@/utils/session'

const mountForm = (username = '', password = '') =>
  mountWith(LoginForm, { props: { username, password } })

describe('LoginForm', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('asks for both fields before trying to sign in', async () => {
    const { wrapper } = mountForm('student', '')
    await wrapper.find('form').trigger('submit')
    expect(toastTexts()).toEqual([t('auth.validation.fillAll')])
    expect(useAuthStore().isAuthenticated).toBe(false)
  })

  it('shows the error for a wrong password and stays signed out', async () => {
    const { wrapper, router } = mountForm('student', 'wrong')
    const push = vi.spyOn(router, 'push')
    await wrapper.find('form').trigger('submit')
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(toastTexts()).toHaveLength(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('signs in and goes home shortly after', async () => {
    vi.useFakeTimers()
    const { wrapper, router } = mountForm('student', '123456')
    const push = vi.spyOn(router, 'push')
    await wrapper.find('form').trigger('submit')
    expect(useAuthStore().currentUser?.username).toBe('student')
    expect(push).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(push).toHaveBeenCalledWith('/')
  })

  it("doesn't remember the sign-in unless asked, and says what remembering means", async () => {
    const { wrapper } = mountForm('student', '123456')
    const box = wrapper.find<HTMLInputElement>('#login-remember')
    expect(box.element.checked).toBe(false) // churches share computers
    expect(box.attributes('aria-describedby')).toBe('login-remember-hint')
    expect(wrapper.find('#login-remember-hint').text()).toBe(t('auth.login.rememberHint'))
    await wrapper.find('form').trigger('submit')
    expect(sessionMeta()?.remember).toBe(false)
  })

  it('remembers the sign-in when ticked', async () => {
    const { wrapper } = mountForm('student', '123456')
    await wrapper.find('#login-remember').setValue(true)
    await wrapper.find('form').trigger('submit')
    expect(sessionMeta()?.remember).toBe(true)
  })

  it('goes back to the page that sent them to sign in', async () => {
    vi.useFakeTimers()
    const { wrapper, router } = mountForm('student', '123456')
    await router.push('/login?redirect=/student/somewhere')
    const push = vi.spyOn(router, 'push')
    await wrapper.find('form').trigger('submit')
    vi.advanceTimersByTime(500)
    expect(push).toHaveBeenCalledWith('/student/somewhere')
  })

  it('ignores a redirect to another site', async () => {
    vi.useFakeTimers()
    const { wrapper, router } = mountForm('student', '123456')
    await router.push('/login?redirect=//evil.example')
    const push = vi.spyOn(router, 'push')
    await wrapper.find('form').trigger('submit')
    vi.advanceTimersByTime(500)
    expect(push).toHaveBeenCalledWith('/')
  })

  it('binds the fields with v-model', async () => {
    const { wrapper } = mountForm()
    await wrapper.find('#login-username').setValue('teacher')
    await wrapper.find('#login-password').setValue('pw')
    expect(wrapper.emitted('update:username')?.at(-1)).toEqual(['teacher'])
    expect(wrapper.emitted('update:password')?.at(-1)).toEqual(['pw'])
  })

  it('toggles password visibility and asks for the forgot-password dialog', async () => {
    const { wrapper } = mountForm('a', 'b')
    const pwd = wrapper.find('#login-password')
    expect(pwd.attributes('type')).toBe('password')
    await wrapper.find('.pwd-eye-btn').trigger('click')
    expect(pwd.attributes('type')).toBe('text')

    await wrapper.find('.forgot-pwd-link').trigger('click')
    expect(wrapper.emitted('forgot-password')).toHaveLength(1)
  })
})
