/**
 * @file src/utils/limits.ts
 * @description The longest text each field accepts, in characters — one list for the whole app.
 *
 * The same numbers are the API's limits (docs/backend_api_spec.md〈欄位長度上限〉) and the
 * database's column sizes (docs/database_schema.md), so whatever the form accepts the backend
 * will save. Change a number here and there together.
 *
 * Counted as `String.length` (what maxlength counts), which is never less than the number of
 * characters the database counts, so a value that fits here fits there.
 */

import { USERNAME_MAX } from '@/utils/account'
import { AVATAR_URL_MAX } from '@/utils/avatar'

export const MAX_LENGTH = {
  // Accounts
  username: USERNAME_MAX, // 30
  email: 254, // the longest address mail servers accept
  /** Sign-in field: a username or an email address */
  identifier: 254,
  /** A new password. bcrypt only uses the first 72 bytes, so keep well inside that */
  newPassword: 64,
  /** The sign-in password field: roomier than newPassword, so no older password is cut off */
  password: 128,
  inviteCode: 20,
  displayName: 20, // shown in the navigation bar
  realName: 50,
  avatarUrl: AVATAR_URL_MAX, // 2048

  // Lecturers and themes
  lecturerName: 50,
  themeName: 50,

  // Listening and feedback
  sessionNotes: 2000, // a student's notes on a lecture
  feedbackReply: 1000, // a teacher's reply to those notes

  // Shining Project
  shiningName: 50,
  shiningChurch: 100,
  schoolGrade: 50,
  customChallenge: 200,

  // Bookings
  scripture: 100, // one passage, e.g. 約翰福音 3:16-21
  readingNotes: 2000,
  materials: 500,
  cancelReason: 500,
  sessionSummary: 2000, // the teacher's notes on a finished session
  attendeeFeedback: 1000, // per student, from the teacher or the student

  /** Not saved anywhere; just keeps a pasted novel out of the search box */
  search: 100
} as const

export type LimitedField = keyof typeof MAX_LENGTH

/** Long texts show a running count; past this share of the limit it is highlighted */
export const NEAR_LIMIT = 0.9
