import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher.vue'
import type { Ref } from 'vue'
import i18n, { setLocale, type SupportedLocale } from '@/i18n'
import { mountWith } from '@/__tests__/helpers'

const buttons = (wrapper: ReturnType<typeof mountWith>['wrapper']) => {
  const [zh, en] = wrapper.findAll('button')
  return { zh: zh!, en: en! }
}
// The app's i18n runs in Composition mode, where locale is a ref (its type doesn't say so)
const locale = () => (i18n.global.locale as unknown as Ref<SupportedLocale>).value

describe('LanguageSwitcher', () => {
  afterEach(async () => {
    await setLocale('zh-TW')
  })

  it('switches to the language pressed, and remembers it', async () => {
    const { wrapper } = mountWith(LanguageSwitcher)
    const { zh, en } = buttons(wrapper)
    expect(zh.attributes('aria-pressed')).toBe('true')
    expect(en.attributes('aria-pressed')).toBe('false')

    await en.trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(locale()).toBe('en'))
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('superstart_lang')).toBe('"en"')
    expect(en.attributes('aria-pressed')).toBe('true')
    expect(zh.attributes('aria-pressed')).toBe('false')

    await zh.trigger('click')
    await vi.waitFor(() => expect(locale()).toBe('zh-TW'))
    expect(document.documentElement.lang).toBe('zh-TW')
  })

  it('keeps the language when its own button is pressed again', async () => {
    const { wrapper } = mountWith(LanguageSwitcher)
    const { zh, en } = buttons(wrapper)
    await zh.trigger('click')
    await flushPromises()
    expect(locale()).toBe('zh-TW')

    await en.trigger('click')
    await vi.waitFor(() => expect(locale()).toBe('en'))
    await en.trigger('click')
    await flushPromises()
    expect(locale()).toBe('en')
  })

  it('marks each button with its own language and hides the decorative globe', () => {
    const { wrapper } = mountWith(LanguageSwitcher)
    const { zh, en } = buttons(wrapper)
    expect(zh.attributes('lang')).toBe('zh-TW')
    expect(en.attributes('lang')).toBe('en')
    expect(zh.find('[aria-hidden="true"]').text()).toBe('🌐')
    expect(wrapper.attributes('role')).toBe('group')
  })
})
