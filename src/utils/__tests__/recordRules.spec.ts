import { describe, it, expect } from 'vitest'
import {
  listenSessionProblem,
  birthdayProblem,
  lectureEntryProblem,
  latestListenTime,
  today,
  EARLIEST_BIRTHDAY
} from '@/utils/recordRules'

// Local wall time, like the date inputs: 2026-11-18 14:30 on this machine
const now = new Date(2026, 10, 18, 14, 30)
const session = (patch: Partial<{ lecturer: string; listenedAt: string; notes: string }>) => ({
  lecturer: '張牧師',
  listenedAt: '2026-11-18T10:00',
  notes: '',
  ...patch
})

describe('listen sessions', () => {
  it('accepts a lecture heard already, or ending within the hour', () => {
    expect(listenSessionProblem(session({}), now)).toBeNull()
    expect(listenSessionProblem(session({ listenedAt: '2026-11-18T15:30' }), now)).toBeNull()
    expect(listenSessionProblem(session({ listenedAt: '2026-11-18T15:30:00' }), now)).toBeNull()
    expect(latestListenTime(now)).toBe('2026-11-18T15:30')
  })

  it('refuses a time in the future: progress counts only lectures heard', () => {
    expect(listenSessionProblem(session({ listenedAt: '2026-11-18T15:31' }), now)).toBe(
      'listenedAtFuture'
    )
    expect(listenSessionProblem(session({ listenedAt: '2027-03-01T19:30' }), now)).toBe(
      'listenedAtFuture'
    )
  })

  it('needs a lecturer and a real time', () => {
    expect(listenSessionProblem(session({ lecturer: '  ' }), now)).toBe('lecturerRequired')
    expect(listenSessionProblem(session({ lecturer: '講'.repeat(51) }), now)).toBe(
      'lecturerTooLong'
    )
    expect(listenSessionProblem(session({ listenedAt: '' }), now)).toBe('listenedAtRequired')
    expect(listenSessionProblem(session({ listenedAt: '2026/11/18 10:00' }), now)).toBe(
      'listenedAtInvalid'
    )
    expect(listenSessionProblem(session({ listenedAt: '2026-02-30T10:00' }), now)).toBe(
      'listenedAtInvalid'
    )
  })

  it('limits the notes', () => {
    expect(listenSessionProblem(session({ notes: 'a'.repeat(2000) }), now)).toBeNull()
    expect(listenSessionProblem(session({ notes: 'a'.repeat(2001) }), now)).toBe('notesTooLong')
  })
})

describe('birthday', () => {
  it('is optional, and between 1900 and today', () => {
    expect(birthdayProblem('', now)).toBeNull()
    expect(birthdayProblem('2012-05-04', now)).toBeNull()
    expect(birthdayProblem(today(now), now)).toBeNull()
    expect(birthdayProblem(EARLIEST_BIRTHDAY, now)).toBeNull()
    expect(birthdayProblem('2026-11-19', now)).toBe('birthdayFuture')
    expect(birthdayProblem('1899-12-31', now)).toBe('birthdayTooEarly')
    expect(birthdayProblem('2012-13-01', now)).toBe('birthdayInvalid')
  })
})

describe('Shining Project lectures', () => {
  it('may leave the date out, but not put it after today', () => {
    expect(lectureEntryProblem({ speaker: '王講師', date: '' }, now)).toBeNull()
    expect(lectureEntryProblem({ speaker: '王講師', date: '2026-11-18' }, now)).toBeNull()
    expect(lectureEntryProblem({ speaker: '王講師', date: '2026-11-19' }, now)).toBe(
      'lectureDateFuture'
    )
    expect(lectureEntryProblem({ speaker: '王講師', date: '2026-02-30' }, now)).toBe(
      'lectureDateInvalid'
    )
    expect(lectureEntryProblem({ speaker: '講'.repeat(51), date: '' }, now)).toBe('speakerTooLong')
  })
})
