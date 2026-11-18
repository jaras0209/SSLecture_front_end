/**
 * @file src/utils/bookingRules.ts
 * @description When a booking may be proposed, confirmed and recorded. A booking arranges a
 * lecture yet to come; what happened there (completion, attendance, feedback) can only be
 * recorded once it has started. Same rules as the API (docs/backend_api_spec.md 第 10 節),
 * checked by the bookings store's actions before saving.
 *
 * Times are local wall time ("2026-11-20T19:30"), which compare correctly as strings.
 */

import { toLocalDateTimeInput } from '@/utils/datetime'

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

/** A key under stores.bookings in the language files */
export type BookingProblem =
  'timeRequired' | 'timeInvalid' | 'timePast' | 'notPending' | 'notConfirmed' | 'notStarted'

/** The current time as a datetime-local value: a booking must be later than this */
export function nowLocal(now: Date = new Date()): string {
  return toLocalDateTimeInput(now)
}

/** When a booking starts: the confirmed time, or the proposed one until it is confirmed */
export function bookingStart(session: { proposedAt: string; confirmedAt?: string }): string {
  return session.confirmedAt || session.proposedAt
}

function isRealDate(value: string): boolean {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number) as [number, number, number]
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

/** What is wrong with a time proposed or confirmed for a booking, or null */
export function bookingTimeProblem(time: string, now: Date = new Date()): BookingProblem | null {
  if (!time) return 'timeRequired'
  if (!DATE_TIME.test(time) || !isRealDate(time)) return 'timeInvalid'
  if (time.slice(0, 16) <= nowLocal(now)) return 'timePast'
  return null
}

/**
 * Why attendance can't be recorded for a booking yet, or null: its time must be confirmed and
 * reached. A completed booking stays open to corrections (e.g. by the lecturer afterwards).
 */
export function recordingProblem(
  session: { status: string; proposedAt: string; confirmedAt?: string },
  now: Date = new Date()
): BookingProblem | null {
  if (session.status !== 'confirmed' && session.status !== 'completed') return 'notConfirmed'
  if (bookingStart(session).slice(0, 16) > nowLocal(now)) return 'notStarted'
  return null
}

/** Why a booking can't be marked done yet, or null: confirmed, and started */
export function completionProblem(
  session: { status: string; proposedAt: string; confirmedAt?: string },
  now: Date = new Date()
): BookingProblem | null {
  if (session.status !== 'confirmed') return 'notConfirmed'
  return recordingProblem(session, now)
}
