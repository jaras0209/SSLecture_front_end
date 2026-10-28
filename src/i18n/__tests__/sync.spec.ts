import { describe, it, expect, afterEach, vi } from 'vitest'
import { i18n, setLocale } from '@/i18n'

const currentLocale = () => (i18n.global.locale as unknown as { value: string }).value

describe('locale sync across tabs', () => {
  afterEach(async () => {
    await setLocale('zh-TW')
    vi.restoreAllMocks()
  })

  it('follows a language change made in another tab, without writing it back', async () => {
    const setItem = vi.spyOn(localStorage, 'setItem')
    window.dispatchEvent(new StorageEvent('storage', { key: 'superstart_lang', newValue: '"en"' }))
    await vi.waitFor(() => expect(currentLocale()).toBe('en'))
    expect(document.documentElement.lang).toBe('en')
    expect(setItem).not.toHaveBeenCalled()
  })
})

describe('lazy-loaded locales', () => {
  afterEach(async () => {
    await setLocale('zh-TW')
  })

  it('loads the English messages on first use', async () => {
    await setLocale('en')
    expect(currentLocale()).toBe('en')
    expect(i18n.global.t('auth.tabs.login')).toBe('Sign In')
    expect(JSON.parse(localStorage.getItem('superstart_lang') || 'null')).toBe('en')
  })

  it('applies only the latest choice when switching quickly', async () => {
    const toEn = setLocale('en')
    const toZh = setLocale('zh-TW')
    await Promise.all([toEn, toZh])
    expect(currentLocale()).toBe('zh-TW')
    expect(JSON.parse(localStorage.getItem('superstart_lang') || 'null')).toBe('zh-TW')
  })
})
