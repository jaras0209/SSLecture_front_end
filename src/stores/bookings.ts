import { defineStore } from 'pinia'
import { ref } from 'vue'
import { safeGet } from '@/utils/storage'
import { normalizeLecturerTitle } from '@/utils/lecturerTitle'
import { persistToStorage } from '@/utils/persist'
import { toLocalDateTimeInput } from '@/utils/datetime'
import { createId } from '@/utils/id'
import { translate as t } from '@/i18n'
import {
  bookingTimeProblem,
  completionProblem,
  recordingProblem,
  type BookingProblem
} from '@/utils/bookingRules'
import type { SaveResult } from '@/stores/courses'

const refused = (problem: BookingProblem): SaveResult => ({
  success: false,
  message: t(`stores.bookings.${problem}`)
})
const SAVED: SaveResult = { success: true, message: '' }

// 型別定義集中至 src/types/bookings.ts—從這裡 re-export 保持向下相容
export type {
  BookingStatus,
  AttendanceStatus,
  BookingPrep,
  BookingSession,
  BookingAttendee,
  BookingSessionsDb,
  BookingAttendeesDb
} from '@/types/bookings'

// 引入型別供 store 內部使用
import type {
  BookingStatus,
  BookingPrep,
  BookingSession,
  BookingAttendee,
  BookingSessionsDb,
  BookingAttendeesDb
} from '@/types/bookings'

// ─── Store ───────────────────────────────────────────────────────────────────

export const useBookingsStore = defineStore('bookings', () => {
  // ── State ──────────────────────────────────────────────────────────────────

  const sessionsDb = ref<BookingSessionsDb>(
    safeGet<BookingSessionsDb>('superstart_booking_sessions_db', {}, { clearOnError: true })
  )

  const attendeesDb = ref<BookingAttendeesDb>(
    safeGet<BookingAttendeesDb>('superstart_booking_attendees_db', {}, { clearOnError: true })
  )

  // Lecturer titles used to be stored as Chinese text; they are codes now
  for (const s of Object.values(sessionsDb.value)) {
    s.lecturerTitle = normalizeLecturerTitle(s.lecturerTitle ?? '')
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  persistToStorage(sessionsDb, 'superstart_booking_sessions_db')

  persistToStorage(attendeesDb, 'superstart_booking_attendees_db')

  // ── Getters ────────────────────────────────────────────────────────────────

  function getAttendeesForSession(sessionId: string): BookingAttendee[] {
    return Object.values(attendeesDb.value).filter((a) => a.sessionId === sessionId)
  }

  function getSessionsByChurch(church: string): BookingSession[] {
    return Object.values(sessionsDb.value)
      .filter((s) => s.church === church)
      .sort((a, b) => b.proposedAt.localeCompare(a.proposedAt))
  }

  function getSessionsByTeacher(teacherUsername: string): BookingSession[] {
    return Object.values(sessionsDb.value)
      .filter((s) => s.teacherUsername === teacherUsername)
      .sort((a, b) => b.proposedAt.localeCompare(a.proposedAt))
  }

  /** Sessions given by any of the lecturer records `lecturerIds`, newest first */
  function getSessionsByLecturers(lecturerIds: string[]): BookingSession[] {
    return Object.values(sessionsDb.value)
      .filter((s) => lecturerIds.includes(s.lecturerId))
      .sort((a, b) => b.proposedAt.localeCompare(a.proposedAt))
  }

  function getSessionsForStudent(studentUsername: string): Array<{
    session: BookingSession
    attendee: BookingAttendee
  }> {
    return Object.values(attendeesDb.value)
      .filter((a) => a.studentUsername === studentUsername)
      .map((a) => ({ session: sessionsDb.value[a.sessionId], attendee: a }))
      .filter((x) => !!x.session)
      .sort((a, b) => b.session.proposedAt.localeCompare(a.session.proposedAt))
  }

  function getUpcomingSessions(studentUsername: string) {
    const now = toLocalDateTimeInput()
    return getSessionsForStudent(studentUsername).filter(
      (x) =>
        (x.session.status === 'pending' || x.session.status === 'confirmed') &&
        x.session.proposedAt >= now
    )
  }

  function getPastSessions(studentUsername: string) {
    const now = toLocalDateTimeInput()
    return getSessionsForStudent(studentUsername).filter(
      (x) =>
        x.session.status === 'completed' ||
        x.session.status === 'cancelled' ||
        x.session.proposedAt < now
    )
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function createSession(params: {
    courseId: string
    courseTitle: string
    lecturerId: string
    lecturerName: string
    lecturerTitle: string
    teacherUsername: string
    proposedAt: string
    durationMinutes: number
    prep: BookingPrep
    studentUsernames: string[]
    church: string
  }): BookingSession {
    const sessionId = createId('sess')
    const now = new Date().toISOString()

    const session: BookingSession = {
      id: sessionId,
      courseId: params.courseId,
      courseTitle: params.courseTitle,
      lecturerId: params.lecturerId,
      lecturerName: params.lecturerName,
      lecturerTitle: normalizeLecturerTitle(params.lecturerTitle),
      teacherUsername: params.teacherUsername,
      proposedAt: params.proposedAt,
      durationMinutes: params.durationMinutes,
      status: 'pending',
      prep: { ...params.prep },
      teacherSessionNotes: '',
      church: params.church,
      isGroupSession: params.studentUsernames.length > 1,
      createdAt: now,
      updatedAt: now
    }

    sessionsDb.value[sessionId] = session

    params.studentUsernames.forEach((username) => {
      const attendeeId = `att_${sessionId}_${username}`
      attendeesDb.value[attendeeId] = {
        id: attendeeId,
        sessionId,
        studentUsername: username,
        attendanceStatus: 'invited',
        studentFeedback: '',
        teacherFeedback: '',
        createdAt: now,
        updatedAt: now
      }
    })

    return session
  }

  function updateSessionStatus(
    sessionId: string,
    status: BookingStatus,
    options?: { confirmedAt?: string; cancelReason?: string }
  ): void {
    const session = sessionsDb.value[sessionId]
    if (!session) return
    session.status = status
    session.updatedAt = new Date().toISOString()
    if (status === 'confirmed' && options?.confirmedAt) session.confirmedAt = options.confirmedAt
    if (status === 'cancelled' && options?.cancelReason) session.cancelReason = options.cancelReason
  }

  function updateSessionProp<K extends keyof BookingSession>(
    sessionId: string,
    key: K,
    value: BookingSession[K]
  ): void {
    const session = sessionsDb.value[sessionId]
    if (!session) return
    session[key] = value
    session.updatedAt = new Date().toISOString()
  }

  /**
   * Cancel a teacher's bookings that haven't happened yet (pending or confirmed), e.g. when
   * the teacher account is removed; completed and cancelled ones stay as history.
   * Returns how many were cancelled.
   */
  function cancelOpenSessionsOf(teacherUsername: string, reason: string): number {
    const open = getSessionsByTeacher(teacherUsername).filter(
      (s) => s.status === 'pending' || s.status === 'confirmed'
    )
    open.forEach((s) => updateSessionStatus(s.id, 'cancelled', { cancelReason: reason }))
    return open.length
  }

  function updatePrep(sessionId: string, prep: Partial<BookingPrep>): void {
    const session = sessionsDb.value[sessionId]
    if (!session) return
    Object.assign(session.prep, prep)
    session.updatedAt = new Date().toISOString()
  }

  function completeSession(sessionId: string, teacherNotes: string): void {
    const session = sessionsDb.value[sessionId]
    if (!session) return
    session.status = 'completed'
    session.teacherSessionNotes = teacherNotes
    session.updatedAt = new Date().toISOString()
  }

  function updateAttendee(
    sessionId: string,
    studentUsername: string,
    updates: Partial<
      Pick<
        BookingAttendee,
        'attendanceStatus' | 'studentFeedback' | 'teacherFeedback' | 'linkedListenSessionId'
      >
    >
  ): void {
    const attendeeId = `att_${sessionId}_${studentUsername}`
    const attendee = attendeesDb.value[attendeeId]
    if (!attendee) return
    Object.assign(attendee, updates)
    attendee.updatedAt = new Date().toISOString()
    if ('studentFeedback' in updates || 'teacherFeedback' in updates) {
      attendee.feedbackAt = new Date().toISOString()
    }
  }

  function addAttendeeToSession(sessionId: string, studentUsername: string): void {
    const attendeeId = `att_${sessionId}_${studentUsername}`
    if (attendeesDb.value[attendeeId]) return
    const now = new Date().toISOString()
    attendeesDb.value[attendeeId] = {
      id: attendeeId,
      sessionId,
      studentUsername,
      attendanceStatus: 'invited',
      studentFeedback: '',
      teacherFeedback: '',
      createdAt: now,
      updatedAt: now
    }
    const session = sessionsDb.value[sessionId]
    if (session) {
      session.isGroupSession = getAttendeesForSession(sessionId).length > 1
      session.updatedAt = now
    }
  }

  function deleteSession(sessionId: string): void {
    delete sessionsDb.value[sessionId]
    Object.keys(attendeesDb.value)
      .filter((k) => k.startsWith(`att_${sessionId}_`))
      .forEach((k) => delete attendeesDb.value[k])
  }

  // ── Return ─────────────────────────────────────────────────────────────────

  // ── Checked actions: what the pages use ─────────────────────────────────────
  // The functions above store what they are given (loading existing data, tests); these check
  // the rules first, as the API will (utils/bookingRules.ts), and save nothing when refused.

  /** Propose a booking: its time must be still to come */
  function proposeSession(
    params: Parameters<typeof createSession>[0]
  ): SaveResult & { session?: BookingSession } {
    const problem = bookingTimeProblem(params.proposedAt)
    if (problem) return refused(problem)
    return { ...SAVED, session: createSession(params) }
  }

  /** Confirm a pending booking at a time still to come */
  function confirmSession(sessionId: string, confirmedAt: string): SaveResult {
    const session = sessionsDb.value[sessionId]
    if (!session) return { success: false, message: t('stores.bookings.notFound') }
    if (session.status !== 'pending') return refused('notPending')
    const problem = bookingTimeProblem(confirmedAt)
    if (problem) return refused(problem)
    updateSessionStatus(sessionId, 'confirmed', { confirmedAt })
    return SAVED
  }

  /**
   * Mark a confirmed booking done, with each student's attendance and feedback: only once it
   * has started, so nobody is recorded as attending a lecture that hasn't happened
   */
  function finishSession(
    sessionId: string,
    teacherNotes: string,
    attendees: Record<
      string,
      Partial<Pick<BookingAttendee, 'attendanceStatus' | 'studentFeedback' | 'teacherFeedback'>>
    >
  ): SaveResult {
    const session = sessionsDb.value[sessionId]
    if (!session) return { success: false, message: t('stores.bookings.notFound') }
    const problem = completionProblem(session)
    if (problem) return refused(problem)
    Object.entries(attendees).forEach(([username, data]) =>
      updateAttendee(sessionId, username, { ...data })
    )
    completeSession(sessionId, teacherNotes)
    return SAVED
  }

  /** A lecturer records one student's attendance: only once the lecture has started */
  function recordAttendance(
    sessionId: string,
    studentUsername: string,
    attendanceStatus: BookingAttendee['attendanceStatus']
  ): SaveResult {
    const session = sessionsDb.value[sessionId]
    if (!session) return { success: false, message: t('stores.bookings.notFound') }
    const problem = recordingProblem(session)
    if (problem) return refused(problem)
    updateAttendee(sessionId, studentUsername, { attendanceStatus })
    return SAVED
  }

  return {
    sessionsDb,
    attendeesDb,
    getAttendeesForSession,
    getSessionsByChurch,
    getSessionsByTeacher,
    getSessionsByLecturers,
    getSessionsForStudent,
    getUpcomingSessions,
    getPastSessions,
    createSession,
    updateSessionStatus,
    cancelOpenSessionsOf,
    updateSessionProp,
    updatePrep,
    completeSession,
    updateAttendee,
    addAttendeeToSession,
    deleteSession,
    proposeSession,
    confirmSession,
    finishSession,
    recordAttendance
  }
})
