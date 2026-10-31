import { describe, it, expect, afterEach } from 'vitest'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { setLocale } from '@/i18n'
import { withSetup } from '@/__tests__/helpers'

// Intl may put a narrow or non-breaking space between date and time, depending on the
// Node / ICU version; compare with plain spaces
const plainSpaces = (text: string) => text.replace(/\s+/g, ' ')

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

  it('shows a booking time in the current language, marking a time that is only proposed', async () => {
    const helper = withSetup(() => useI18nHelper())
    const tBookingTime = (s: Parameters<typeof helper.tBookingTime>[0]) =>
      plainSpaces(helper.tBookingTime(s))
    const pending = { proposedAt: '2099-02-01T14:00', status: 'pending' }
    const confirmed = { ...pending, confirmedAt: '2099-02-03T09:30', status: 'confirmed' }
    expect(tBookingTime(pending)).toBe('2099/02/01 14:00（提議）')
    expect(tBookingTime(confirmed)).toBe('2099/02/03 09:30')
    // a cancelled booking that never got a time is not "proposed" any more
    expect(tBookingTime({ ...pending, status: 'cancelled' })).toBe('2099/02/01 14:00')

    await setLocale('en')
    expect(tBookingTime(pending)).toBe('02/01/2099, 14:00 (Proposed)')
    expect(tBookingTime(confirmed)).toBe('02/03/2099, 09:30')
  })

  it('formats a date without the time for the current locale', async () => {
    const { tDate } = withSetup(() => useI18nHelper())
    expect(tDate(undefined)).toBe('')
    expect(tDate('2026-11-07T10:00')).toBe('2026/11/07')
    expect(tDate('not a date')).toBe('not a date')
    await setLocale('en')
    expect(tDate('2026-11-07T10:00')).toBe('11/07/2026')
  })
})
