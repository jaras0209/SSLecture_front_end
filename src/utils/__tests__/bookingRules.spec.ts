import { describe, it, expect } from 'vitest'
import {
  bookingTimeProblem,
  recordingProblem,
  completionProblem,
  bookingStart,
  nowLocal
} from '@/utils/bookingRules'

const now = new Date(2026, 10, 18, 14, 30) // local time
const booking = (status: string, proposedAt: string, confirmedAt?: string) => ({
  status,
  proposedAt,
  confirmedAt
})

describe('booking times', () => {
  it('must be still to come', () => {
    expect(nowLocal(now)).toBe('2026-11-18T14:30')
    expect(bookingTimeProblem('2026-11-18T14:31', now)).toBeNull()
    expect(bookingTimeProblem('2026-11-25T19:30:00', now)).toBeNull()
    expect(bookingTimeProblem('2026-11-18T14:30', now)).toBe('timePast')
    expect(bookingTimeProblem('2026-11-01T10:00', now)).toBe('timePast')
  })

  it('must be given, and real', () => {
    expect(bookingTimeProblem('', now)).toBe('timeRequired')
    expect(bookingTimeProblem('2026-11-31T10:00', now)).toBe('timeInvalid')
    expect(bookingTimeProblem('next Tuesday', now)).toBe('timeInvalid')
  })
})

describe('recording what happened', () => {
  it('starts at the confirmed time, or the proposed one until then', () => {
    expect(bookingStart(booking('pending', '2026-11-20T10:00'))).toBe('2026-11-20T10:00')
    expect(bookingStart(booking('confirmed', '2026-11-20T10:00', '2026-11-21T09:00'))).toBe(
      '2026-11-21T09:00'
    )
  })

  it('waits for a confirmed time that has been reached', () => {
    expect(recordingProblem(booking('pending', '2026-11-01T10:00'), now)).toBe('notConfirmed')
    expect(recordingProblem(booking('cancelled', '2026-11-01T10:00'), now)).toBe('notConfirmed')
    expect(
      recordingProblem(booking('confirmed', '2026-11-01T10:00', '2026-11-18T15:00'), now)
    ).toBe('notStarted')
    expect(
      recordingProblem(booking('confirmed', '2026-11-01T10:00', '2026-11-18T14:30'), now)
    ).toBeNull()
  })

  it('lets attendance be corrected after completion, but completes a booking only once', () => {
    const done = booking('completed', '2026-11-01T10:00', '2026-11-01T10:00')
    expect(recordingProblem(done, now)).toBeNull()
    expect(completionProblem(done, now)).toBe('notConfirmed')
    expect(
      completionProblem(booking('confirmed', '2026-11-01T10:00', '2026-11-01T10:00'), now)
    ).toBeNull()
  })
})
