import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LoginCallback from '@/views/LoginCallback.vue'
import { useAuthStore } from '@/stores/auth'
import { setup, t } from '@/__tests__/helpers'

/** Open the callback page at `query` (what the OAuth provider sent back) */
async function openCallback(query: string) {
  const { plugins, router } = setup()
  await router.push(`/login/callback${query}`)
  const push = vi.spyOn(router, 'push')
  const replace = vi.spyOn(router, 'replace')
  const wrapper = mount(LoginCallback, { global: { plugins } })
  return { wrapper, router, push, replace }
}

describe('LoginCallback', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('explains a refused sign-in and returns to the login page after 5 seconds', async () => {
    vi.useFakeTimers()
    const { wrapper, push } = await openCallback('?error=access_denied')
    await flushPromises()
    expect(wrapper.find('.callback-desc').text()).toBe(
      t('callback.errorDenied', { error: 'access_denied' })
    )
    expect(wrapper.find('.callback-countdown').text()).toBe(t('callback.countdown', { n: 5 }))

    vi.advanceTimersByTime(4000)
    await flushPromises()
    expect(push).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(push).toHaveBeenCalledWith('/login?error=oauth_failed')
  })

  it('asks to try again when no code came back', async () => {
    vi.useFakeTimers()
    const { wrapper } = await openCallback('')
    await flushPromises()
    expect(wrapper.find('.callback-desc').text()).toBe(t('callback.errorNoCode'))
  })

  it('stops the countdown when they go back early, so it cannot navigate again later', async () => {
    vi.useFakeTimers()
    const { wrapper, push } = await openCallback('?error=access_denied')
    await flushPromises()
    await wrapper.find('.callback-error button').trigger('click')
    expect(push).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    vi.advanceTimersByTime(10_000)
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('signs in with the code and goes on to onboarding for a new user', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { replace } = await openCallback('?code=abc')
    await vi.advanceTimersByTimeAsync(1000) // the mock exchange takes a second
    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(replace).toHaveBeenCalledWith('/onboarding')
  })
})
