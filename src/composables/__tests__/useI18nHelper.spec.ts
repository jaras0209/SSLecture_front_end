import { describe, it, expect, afterEach } from 'vitest'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { setLocale } from '@/i18n'
import { withSetup } from '@/__tests__/helpers'

describe('useI18nHelper()', () => {
  afterEach(async () => {
    await setLocale('zh-TW')
  })

  it('translates roles, booking statuses and dynamic keys in the current locale', async () => {
    const { tRole, tStatus, tDynamic } = withSetup(() => useI18nHelper())
    expect(tRole('teacher')).toBe('輔導教師')
    expect(tStatus('pending')).toBe('⏳ 待確認')
    expect(tDynamic('passwordStrength.strong')).toBe('強密碼')

    await setLocale('en')
    expect(tRole('teacher')).not.toBe('輔導教師')
    expect(tRole('teacher')).toMatch(/teacher/i)
  })

  it('formats timestamps for the current locale', async () => {
    const { tDateTime } = withSetup(() => useI18nHelper())
    expect(tDateTime(undefined)).toBe('')
    const zh = tDateTime('2026-10-28T06:30:00.000Z')
    expect(zh).toContain('2026')

    await setLocale('en')
    expect(tDateTime('2026-10-28T06:30:00.000Z')).not.toBe(zh)
  })
})
