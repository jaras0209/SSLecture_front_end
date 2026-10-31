import { describe, it, expect, afterEach, vi } from 'vitest'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import LoginView from '@/views/LoginView.vue'
import { mountWith, toastTexts, t } from '@/__tests__/helpers'

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
})
