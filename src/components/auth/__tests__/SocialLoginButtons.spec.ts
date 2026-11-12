import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons.vue'
import { mountWith, t } from '@/__tests__/helpers'

// Pressing a button leaves the page; stand in for location so the test can see where to
const realLocation = window.location
let target: { href: string }

beforeEach(() => {
  target = { href: '' }
  Object.defineProperty(window, 'location', { configurable: true, value: target })
})
afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
})

function mountButtons() {
  const { wrapper } = mountWith(SocialLoginButtons, { attachTo: document.body })
  return {
    wrapper,
    google: () => wrapper.find('.google-btn'),
    line: () => wrapper.find('.line-btn')
  }
}

// happy-dom has no PageTransitionEvent, so build the event a browser fires on the way back
function comeBack(persisted: boolean) {
  window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted }))
  return nextTick()
}

describe('SocialLoginButtons', () => {
  it("sends the user to the provider's sign-in through the API", async () => {
    const { wrapper, google, line } = mountButtons()
    await line().trigger('click')
    expect(target.href).toMatch(/\/oauth2\/authorization\/line$/)
    expect(line().text()).toBe(t('auth.social.connecting'))
    expect(google().text()).toBe(t('auth.social.google'))
    // Both stay disabled so a second press can't start another sign-in
    expect(google().attributes('disabled')).toBeDefined()
    expect(line().attributes('disabled')).toBeDefined()
    wrapper.unmount()

    const again = mountButtons()
    await again.google().trigger('click')
    expect(target.href).toMatch(/\/oauth2\/authorization\/google$/)
    again.wrapper.unmount()
  })

  it('works again after the user comes back with the Back button', async () => {
    const { wrapper, google, line } = mountButtons()
    await google().trigger('click')
    expect(google().attributes('disabled')).toBeDefined()

    // A normal page load isn't a restore: nothing to undo
    await comeBack(false)
    expect(google().attributes('disabled')).toBeDefined()

    await comeBack(true)
    expect(google().attributes('disabled')).toBeUndefined()
    expect(line().attributes('disabled')).toBeUndefined()
    expect(google().text()).toBe(t('auth.social.google'))
    wrapper.unmount()
  })

  it('stops listening once it is gone', async () => {
    const { wrapper, google } = mountButtons()
    await google().trigger('click')
    const vm = wrapper.vm as unknown as { isRedirecting: boolean }
    wrapper.unmount()
    await comeBack(true)
    expect(vm.isRedirecting).toBe(true)
  })

  it('leaves the icons out of what screen readers read: the text already names the provider', () => {
    const { wrapper } = mountButtons()
    for (const icon of wrapper.findAll('img.social-icon')) expect(icon.attributes('alt')).toBe('')
    wrapper.unmount()
  })
})
