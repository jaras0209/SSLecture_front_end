import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { toLocalDateTimeInput, normalizeLegacyDateTime, formatDateTime } from '@/utils/datetime'

describe('toLocalDateTimeInput()', () => {
  const originalTz = process.env.TZ

  beforeEach(() => {
    process.env.TZ = 'Asia/Taipei'
  })

  afterEach(() => {
    process.env.TZ = originalTz
  })

  it('formats in local time, not UTC', () => {
    // 2026-10-28 02:05 UTC = 2026-10-28 10:05 Asia/Taipei
    const date = new Date('2026-10-28T02:05:00Z')
    expect(toLocalDateTimeInput(date)).toBe('2026-10-28T10:05')
  })

  it('zero-pads month, day, hour and minute', () => {
    // 2026-01-02 00:03 Asia/Taipei
    const date = new Date('2026-01-01T16:03:00Z')
    expect(toLocalDateTimeInput(date)).toBe('2026-01-02T00:03')
  })

  it('handles the local date rolling over before UTC does', () => {
    // 2026-12-31 20:00 UTC = 2027-01-01 04:00 Asia/Taipei
    const date = new Date('2026-12-31T20:00:00Z')
    expect(toLocalDateTimeInput(date)).toBe('2027-01-01T04:00')
  })
})

describe('normalizeLegacyDateTime()', () => {
  const originalTz = process.env.TZ

  beforeEach(() => {
    process.env.TZ = 'Asia/Taipei'
  })

  afterEach(() => {
    process.env.TZ = originalTz
  })

  it('converts the old zh-TW locale string (local time) to ISO', () => {
    expect(normalizeLegacyDateTime('2026/10/28 14:30:00')).toBe('2026-10-28T06:30:00.000Z')
  })

  it('accepts unpadded month/day and missing seconds', () => {
    expect(normalizeLegacyDateTime('2026/1/5 09:03')).toBe('2026-01-05T01:03:00.000Z')
  })

  it('treats the "24:mm" midnight variant as 00:mm of the same date', () => {
    expect(normalizeLegacyDateTime('2026/10/28 24:05:00')).toBe('2026-10-27T16:05:00.000Z')
  })

  it('leaves ISO strings and unrecognized values unchanged (idempotent)', () => {
    expect(normalizeLegacyDateTime('2026-10-28T06:30:00.000Z')).toBe('2026-10-28T06:30:00.000Z')
    expect(normalizeLegacyDateTime('2025-01-01')).toBe('2025-01-01')
    expect(normalizeLegacyDateTime('')).toBe('')
  })
})

describe('formatDateTime()', () => {
  const originalTz = process.env.TZ

  beforeEach(() => {
    process.env.TZ = 'Asia/Taipei'
  })

  afterEach(() => {
    process.env.TZ = originalTz
  })

  // ICU versions differ in the separator they emit (plain space vs U+00A0 / U+202F),
  // so compare with all whitespace normalized to a plain space
  const normalizeSpaces = (s: string) => s.replace(/\s/g, ' ')

  it('formats an ISO timestamp in local time for the given locale', () => {
    expect(normalizeSpaces(formatDateTime('2026-10-28T06:30:00.000Z', 'zh-TW'))).toBe(
      '2026/10/28 14:30'
    )
    expect(normalizeSpaces(formatDateTime('2026-10-28T06:30:00.000Z', 'en'))).toBe(
      '10/28/2026, 14:30'
    )
  })

  it('returns an empty string for empty input', () => {
    expect(formatDateTime(undefined, 'zh-TW')).toBe('')
    expect(formatDateTime('', 'zh-TW')).toBe('')
  })

  it('shows unparseable values as-is', () => {
    expect(formatDateTime('not a date', 'zh-TW')).toBe('not a date')
  })
})
