import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import UnauthorizedView from '@/views/UnauthorizedView.vue'
import { useAuthStore } from '@/stores/auth'
import { mountPrepared, t } from '@/__tests__/helpers'

function mountSignedIn() {
  return mountPrepared(UnauthorizedView, () => {
    useAuthStore().login('student', '123456')
  })
}

describe('UnauthorizedView', () => {
  it('explains the page is off limits', () => {
    const { wrapper } = mountSignedIn()
    expect(wrapper.find('h1').text()).toBe(t('unauthorized.title'))
    expect(wrapper.text()).toContain(t('unauthorized.subtitle'))
    expect(wrapper.text()).toContain(t('unauthorized.helper'))
  })

  it('goes back to the home page, still signed in', async () => {
    const { wrapper, router } = mountSignedIn()
    await router.push('/unauthorized')
    await wrapper.find('.btn-primary').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
    expect(useAuthStore().currentUser?.username).toBe('student')
  })

  it('signs out and opens the login page to sign in as someone else', async () => {
    const { wrapper, router } = mountSignedIn()
    expect(useAuthStore().currentUser).not.toBeNull()
    const relogin = wrapper.find('.btn-outline')
    expect(relogin.text()).toBe(t('unauthorized.relogin'))
    await relogin.trigger('click')
    await flushPromises()
    expect(useAuthStore().currentUser).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
