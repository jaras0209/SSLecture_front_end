import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { toLocalDateTimeInput } from '@/utils/datetime'

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
