import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { safeGet, safeSet } from '@/utils/storage'

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
  AttendanceStatus,
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

  // ── Persistence ────────────────────────────────────────────────────────────

  watch(sessionsDb, (val) => {
    safeSet('superstart_booking_sessions_db', val)
  }, { deep: true })

  watch(attendeesDb, (val) => {
    safeSet('superstart_booking_attendees_db', val)
  }, { deep: true })

  // ── Getters ────────────────────────────────────────────────────────────────

  function getAttendeesForSession(sessionId: string): BookingAttendee[] {
    return Object.values(attendeesDb.value).filter(a => a.sessionId === sessionId)
  }

  function getSessionsByChurch(church: string): BookingSession[] {
    return Object.values(sessionsDb.value)
      .filter(s => s.church === church)
      .sort((a, b) => b.proposedAt.localeCompare(a.proposedAt))
  }

  function getSessionsByTeacher(teacherUsername: string): BookingSession[] {
    return Object.values(sessionsDb.value)
      .filter(s => s.teacherUsername === teacherUsername)
      .sort((a, b) => b.proposedAt.localeCompare(a.proposedAt))
  }

  function getSessionsForStudent(studentUsername: string): Array<{
    session: BookingSession
    attendee: BookingAttendee
  }> {
    return Object.values(attendeesDb.value)
      .filter(a => a.studentUsername === studentUsername)
      .map(a => ({ session: sessionsDb.value[a.sessionId], attendee: a }))
      .filter(x => !!x.session)
      .sort((a, b) => b.session.proposedAt.localeCompare(a.session.proposedAt))
  }

  function getUpcomingSessions(studentUsername: string) {
    const now = new Date().toISOString().slice(0, 16)
    return getSessionsForStudent(studentUsername).filter(x =>
      (x.session.status === 'pending' || x.session.status === 'confirmed') &&
      x.session.proposedAt >= now
    )
  }

  function getPastSessions(studentUsername: string) {
    const now = new Date().toISOString().slice(0, 16)
    return getSessionsForStudent(studentUsername).filter(x =>
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
    const sessionId = `sess_${Date.now()}`
    const now = new Date().toISOString()

    const session: BookingSession = {
      id: sessionId,
      courseId: params.courseId,
      courseTitle: params.courseTitle,
      lecturerId: params.lecturerId,
      lecturerName: params.lecturerName,
      lecturerTitle: params.lecturerTitle,
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

    params.studentUsernames.forEach(username => {
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

  function updateSessionProp(sessionId: string, key: keyof BookingSession, value: unknown): void {
    const session = sessionsDb.value[sessionId]
    if (!session) return
    ;(session as unknown as Record<string, unknown>)[key] = value
    session.updatedAt = new Date().toISOString()
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
    updates: Partial<Pick<BookingAttendee, 'attendanceStatus' | 'studentFeedback' | 'teacherFeedback' | 'linkedListenSessionId'>>
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
      id: attendeeId, sessionId, studentUsername,
      attendanceStatus: 'invited',
      studentFeedback: '', teacherFeedback: '',
      createdAt: now, updatedAt: now
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
      .filter(k => k.startsWith(`att_${sessionId}_`))
      .forEach(k => delete attendeesDb.value[k])
  }

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    sessionsDb, attendeesDb,
    getAttendeesForSession, getSessionsByChurch, getSessionsByTeacher,
    getSessionsForStudent, getUpcomingSessions, getPastSessions,
    createSession, updateSessionStatus, updateSessionProp,
    updatePrep, completeSession, updateAttendee,
    addAttendeeToSession, deleteSession
  }
})
