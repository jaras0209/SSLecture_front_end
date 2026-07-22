import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBookingsStore } from '@/stores/bookings'
import type { BookingPrep } from '@/stores/bookings'

// ── Helpers ──────────────────────────────────────────────────────────────────

const defaultPrep: BookingPrep = {
  scriptures: ['約翰福音 1:1'],
  readingNotes: '請先閱讀',
  materials: '無',
}

function makeSession(overrides: Partial<Parameters<ReturnType<typeof useBookingsStore>['createSession']>[0]> = {}) {
  const store = useBookingsStore()
  return store.createSession({
    courseId: 'bible-01',
    courseTitle: '聖經時觀',
    lecturerId: 'l1',
    lecturerName: '張牧師',
    lecturerTitle: '牧師',
    teacherUsername: 'teacher',
    proposedAt: '2025-08-01T10:00',
    durationMinutes: 90,
    prep: defaultPrep,
    studentUsernames: ['student'],
    church: '愛與話語',
    ...overrides,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useBookingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  // ── createSession ─────────────────────────────────────────────────────────

  describe('createSession()', () => {
    it('adds the session to sessionsDb', () => {
      const store = useBookingsStore()
      const session = makeSession()
      expect(store.sessionsDb[session.id]).toBeDefined()
      expect(store.sessionsDb[session.id].courseTitle).toBe('聖經時觀')
    })

    it('starts with status=pending', () => {
      const session = makeSession()
      expect(session.status).toBe('pending')
    })

    it('creates attendee records for each studentUsername', () => {
      const store = useBookingsStore()
      const session = makeSession({ studentUsernames: ['student', 'student2'] })
      const attendees = store.getAttendeesForSession(session.id)
      expect(attendees).toHaveLength(2)
      expect(attendees.map(a => a.studentUsername)).toContain('student')
      expect(attendees.map(a => a.studentUsername)).toContain('student2')
    })

    it('sets isGroupSession=true for multiple students', () => {
      const session = makeSession({ studentUsernames: ['s1', 's2'] })
      expect(session.isGroupSession).toBe(true)
    })

    it('sets isGroupSession=false for single student', () => {
      const session = makeSession({ studentUsernames: ['s1'] })
      expect(session.isGroupSession).toBe(false)
    })

    it('sets all attendees to attendanceStatus=invited', () => {
      const store = useBookingsStore()
      const session = makeSession()
      const attendees = store.getAttendeesForSession(session.id)
      expect(attendees.every(a => a.attendanceStatus === 'invited')).toBe(true)
    })
  })

  // ── updateSessionStatus ───────────────────────────────────────────────────

  describe('updateSessionStatus()', () => {
    it('updates the status', () => {
      const store = useBookingsStore()
      const session = makeSession()
      store.updateSessionStatus(session.id, 'confirmed')
      expect(store.sessionsDb[session.id].status).toBe('confirmed')
    })

    it('stores confirmedAt when confirming', () => {
      const store = useBookingsStore()
      const session = makeSession()
      store.updateSessionStatus(session.id, 'confirmed', { confirmedAt: '2025-08-01T10:00' })
      expect(store.sessionsDb[session.id].confirmedAt).toBe('2025-08-01T10:00')
    })

    it('stores cancelReason when cancelling', () => {
      const store = useBookingsStore()
      const session = makeSession()
      store.updateSessionStatus(session.id, 'cancelled', { cancelReason: '時間衝突' })
      expect(store.sessionsDb[session.id].cancelReason).toBe('時間衝突')
    })

    it('does nothing for non-existent sessionId', () => {
      const store = useBookingsStore()
      expect(() => store.updateSessionStatus('ghost_id', 'confirmed')).not.toThrow()
    })
  })

  // ── completeSession ───────────────────────────────────────────────────────

  describe('completeSession()', () => {
    it('sets status to completed', () => {
      const store = useBookingsStore()
      const session = makeSession()
      store.completeSession(session.id, '今天課程非常好！')
      expect(store.sessionsDb[session.id].status).toBe('completed')
    })

    it('saves teacher notes', () => {
      const store = useBookingsStore()
      const session = makeSession()
      store.completeSession(session.id, '學員表現積極')
      expect(store.sessionsDb[session.id].teacherSessionNotes).toBe('學員表現積極')
    })
  })

  // ── updateAttendee ────────────────────────────────────────────────────────

  describe('updateAttendee()', () => {
    it('updates attendance status', () => {
      const store = useBookingsStore()
      const session = makeSession()
      store.updateAttendee(session.id, 'student', { attendanceStatus: 'attended' })
      const attendee = store.getAttendeesForSession(session.id)[0]
      expect(attendee.attendanceStatus).toBe('attended')
    })

    it('updates student feedback and sets feedbackAt', () => {
      const store = useBookingsStore()
      const session = makeSession()
      store.updateAttendee(session.id, 'student', { studentFeedback: '很有收穫！' })
      const attendee = store.getAttendeesForSession(session.id)[0]
      expect(attendee.studentFeedback).toBe('很有收穫！')
      expect(attendee.feedbackAt).toBeTruthy()
    })

    it('does nothing for non-existent attendee', () => {
      const store = useBookingsStore()
      const session = makeSession()
      expect(() =>
        store.updateAttendee(session.id, 'nobody', { attendanceStatus: 'attended' })
      ).not.toThrow()
    })
  })

  // ── addAttendeeToSession ──────────────────────────────────────────────────

  describe('addAttendeeToSession()', () => {
    it('adds a new attendee to an existing session', () => {
      const store = useBookingsStore()
      const session = makeSession()
      store.addAttendeeToSession(session.id, 'student2')
      const attendees = store.getAttendeesForSession(session.id)
      expect(attendees).toHaveLength(2)
    })

    it('does not add duplicate attendees', () => {
      const store = useBookingsStore()
      const session = makeSession()
      store.addAttendeeToSession(session.id, 'student') // already exists
      const attendees = store.getAttendeesForSession(session.id)
      expect(attendees).toHaveLength(1)
    })

    it('updates isGroupSession when second student is added', () => {
      const store = useBookingsStore()
      const session = makeSession()
      expect(store.sessionsDb[session.id].isGroupSession).toBe(false)
      store.addAttendeeToSession(session.id, 'student2')
      expect(store.sessionsDb[session.id].isGroupSession).toBe(true)
    })
  })

  // ── deleteSession ─────────────────────────────────────────────────────────

  describe('deleteSession()', () => {
    it('removes the session from sessionsDb', () => {
      const store = useBookingsStore()
      const session = makeSession()
      store.deleteSession(session.id)
      expect(store.sessionsDb[session.id]).toBeUndefined()
    })

    it('removes all associated attendees', () => {
      const store = useBookingsStore()
      const session = makeSession({ studentUsernames: ['s1', 's2'] })
      store.deleteSession(session.id)
      expect(store.getAttendeesForSession(session.id)).toHaveLength(0)
    })
  })

  // ── getSessionsForStudent ─────────────────────────────────────────────────

  describe('getSessionsForStudent()', () => {
    it('returns sessions for the given student', () => {
      const store = useBookingsStore()
      makeSession({ studentUsernames: ['alice'] })
      makeSession({ studentUsernames: ['bob'] })
      const aliceSessions = store.getSessionsForStudent('alice')
      expect(aliceSessions).toHaveLength(1)
      expect(aliceSessions[0].attendee.studentUsername).toBe('alice')
    })

    it('returns empty array when student has no sessions', () => {
      const store = useBookingsStore()
      expect(store.getSessionsForStudent('nobody')).toHaveLength(0)
    })
  })

  // ── updatePrep ────────────────────────────────────────────────────────────

  describe('updatePrep()', () => {
    it('merges prep fields', () => {
      const store = useBookingsStore()
      const session = makeSession()
      store.updatePrep(session.id, { readingNotes: '更新閱讀說明', materials: '講義PDF' })
      expect(store.sessionsDb[session.id].prep.readingNotes).toBe('更新閱讀說明')
      expect(store.sessionsDb[session.id].prep.materials).toBe('講義PDF')
      // scriptures should remain unchanged
      expect(store.sessionsDb[session.id].prep.scriptures).toEqual(['約翰福音 1:1'])
    })
  })
})
