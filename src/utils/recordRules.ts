/**
 * @file src/utils/recordRules.ts
 * @description Rules for records of things that already happened: a lecture listened to, a
 * Shining Project lecture attended, a birthday. The same rules as the API
 * (docs/backend_api_spec.md: 聽課紀錄 Validation 規則, PATCH /shining/:username), checked by the
 * stores before saving, so no page can save what the backend would refuse.
 *
 * Times are local wall time, as the date inputs give them ("2026-10-28T14:30", "2026-10-28"),
 * which compare correctly as strings.
 */

import { toLocalDateTimeInput } from '@/utils/datetime'
import { MAX_LENGTH } from '@/utils/limits'

/** How far ahead of now a listen time may be: a clock running a little fast, a lecture ending */
export const LISTEN_AHEAD_MS = 60 * 60 * 1000
export const EARLIEST_BIRTHDAY = '1900-01-01'

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** A key under stores.courses in the language files */
export type RuleProblem =
  | 'lecturerRequired'
  | 'lecturerTooLong'
  | 'listenedAtRequired'
  | 'listenedAtInvalid'
  | 'listenedAtFuture'
  | 'notesTooLong'
  | 'birthdayInvalid'
  | 'birthdayFuture'
  | 'birthdayTooEarly'
  | 'lectureDateInvalid'
  | 'lectureDateFuture'
  | 'speakerTooLong'

/** Whether `value` is a real date (not 2026-02-30), given as YYYY-MM-DD at its start */
function isRealDate(value: string): boolean {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number) as [number, number, number]
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

/** Today in local time, YYYY-MM-DD: the latest date for things that already happened */
export function today(now: Date = new Date()): string {
  return toLocalDateTimeInput(now).slice(0, 10)
}

/** The latest listen time accepted now, as a datetime-local value */
export function latestListenTime(now: Date = new Date()): string {
  return toLocalDateTimeInput(new Date(now.getTime() + LISTEN_AHEAD_MS))
}

/** What is wrong with a listen session, or null if it can be saved */
export function listenSessionProblem(
  session: { lecturer: string; listenedAt: string; notes: string },
  now: Date = new Date()
): RuleProblem | null {
  const lecturer = session.lecturer.trim()
  if (!lecturer) return 'lecturerRequired'
  if (lecturer.length > MAX_LENGTH.lecturerName) return 'lecturerTooLong'
  if (!session.listenedAt) return 'listenedAtRequired'
  if (!DATE_TIME.test(session.listenedAt) || !isRealDate(session.listenedAt))
    return 'listenedAtInvalid'
  if (session.listenedAt.slice(0, 16) > latestListenTime(now)) return 'listenedAtFuture'
  if (session.notes.length > MAX_LENGTH.sessionNotes) return 'notesTooLong'
  return null
}

/** What is wrong with a birthday ('' = not given), or null */
export function birthdayProblem(birthday: string, now: Date = new Date()): RuleProblem | null {
  if (!birthday) return null
  if (!DATE.test(birthday) || !isRealDate(birthday)) return 'birthdayInvalid'
  if (birthday > today(now)) return 'birthdayFuture'
  if (birthday < EARLIEST_BIRTHDAY) return 'birthdayTooEarly'
  return null
}

/** What is wrong with a Shining Project lecture entry (date '' = not given), or null */
export function lectureEntryProblem(
  entry: { speaker: string; date: string },
  now: Date = new Date()
): RuleProblem | null {
  if (entry.speaker.trim().length > MAX_LENGTH.lecturerName) return 'speakerTooLong'
  if (!entry.date) return null
  if (!DATE.test(entry.date) || !isRealDate(entry.date)) return 'lectureDateInvalid'
  if (entry.date > today(now)) return 'lectureDateFuture'
  return null
}
