import { describe, it, expect, afterEach, vi } from 'vitest'
import { i18n, setLocale } from '@/i18n'

describe('locale sync across tabs', () => {
  afterEach(() => {
    setLocale('zh-TW')
    vi.restoreAllMocks()
  })

  it('follows a language change made in another tab, without writing it back', () => {
    const setItem = vi.spyOn(localStorage, 'setItem')
    window.dispatchEvent(new StorageEvent('storage', { key: 'superstart_lang', newValue: '"en"' }))
    expect((i18n.global.locale as unknown as { value: string }).value).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(setItem).not.toHaveBeenCalled()
  })
})
