import { describe, it, expect, afterEach, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import LoginView from '@/views/LoginView.vue'
import { mountWith, setup, toastTexts, t } from '@/__tests__/helpers'
import { noteSignOutReason } from '@/utils/session'

const input = (wrapper: ReturnType<typeof mountWith>['wrapper'], id: string) =>
  wrapper.find<HTMLInputElement>(`#${id}`).element

describe('LoginView', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    document.body.innerHTML = ''
  })

  it('fills the sign-in form from a demo account chip in demo mode', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    const { wrapper } = mountWith(LoginView)
    const chips = wrapper.findAll('.demo-chip')
    expect(chips).toHaveLength(5)

    await chips[4].trigger('click') // pastor
    expect(input(wrapper, 'login-username').value).toBe('pastor')
    expect(input(wrapper, 'login-password').value).toBe('123456')
    expect(toastTexts()).toEqual([t('auth.demo.filled', { role: 'pastor' })])
  })

  it('a chip pressed on the register tab fills the sign-in form for when they switch back', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    const { wrapper } = mountWith(LoginView)
    const [loginTab, registerTab] = wrapper.findAll('.auth-tabs .tab-btn')
    await registerTab.trigger('click')
    expect(wrapper.find('#login-username').exists()).toBe(false)

    await wrapper.findAll('.demo-chip')[1].trigger('click') // teacher
    await loginTab.trigger('click')
    expect(input(wrapper, 'login-username').value).toBe('teacher')
  })

  it.each(['false', ''])('hides the demo accounts unless demo mode is on (%j)', (value) => {
    vi.stubEnv('VITE_DEMO_MODE', value)
    const { wrapper } = mountWith(LoginView)
    expect(wrapper.find('.demo-helper').exists()).toBe(false)
  })

  it('switches between the sign-in and register forms', async () => {
    const { wrapper } = mountWith(LoginView)
    const [loginTab, registerTab] = wrapper.findAll('.auth-tabs .tab-btn')
    expect(loginTab.classes()).toContain('active')
    expect(wrapper.find('#login-username').exists()).toBe(true)

    await registerTab.trigger('click')
    expect(registerTab.classes()).toContain('active')
    expect(loginTab.classes()).not.toContain('active')
    expect(wrapper.find('#reg-username').exists()).toBe(true)
    expect(wrapper.find('#login-username').exists()).toBe(false)
  })

  it('opens the forgot-password dialog from the sign-in form', async () => {
    const { wrapper } = mountWith(LoginView, { attachTo: document.body })
    const body = new DOMWrapper(document.body)
    expect(body.find('[role="dialog"]').exists()).toBe(false)

    const forgot = wrapper.findAll('button').find((b) => b.classes('forgot-pwd-link'))!
    await forgot.trigger('click')
    await flushPromises()
    expect(body.find('[role="dialog"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('says why a social sign-in failed, then drops it from the address', async () => {
    const { plugins, router } = setup()
    await router.push('/login?error=oauth_failed&redirect=/admin')
    const wrapper = mount(LoginView, { global: { plugins } })
    await flushPromises()
    expect(wrapper.find('.login-error').text()).toContain(t('auth.login.socialFailed'))
    expect(wrapper.find('.login-error').attributes('role')).toBe('alert')
    // gone from the address (a reload won't show it again), but the redirect is kept
    expect(router.currentRoute.value.query).toEqual({ redirect: '/admin' })
  })

  it('says when they were signed out for being idle, once', () => {
    noteSignOutReason('idle')
    const { wrapper } = mountWith(LoginView)
    const note = wrapper.find('.signed-out-note')
    expect(note.text()).toContain(t('auth.login.signedOutIdle'))
    expect(note.attributes('role')).toBe('status')
    expect(mountWith(LoginView).wrapper.find('.signed-out-note').exists()).toBe(false)
  })

  it('shows no error on a normal visit', () => {
    const { wrapper } = mountWith(LoginView)
    expect(wrapper.find('.login-error').exists()).toBe(false)
  })
})
