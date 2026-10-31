import { describe, it, expect, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useMyLectures } from '@/composables/useMyLectures'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import { withSetup } from '@/__tests__/helpers'

const CHURCH = '愛與話語'

/** The signed-in teacher lectures; bookings are made by them and by `tf` */
function setupLecturer() {
  const lectures = withSetup(() => useMyLectures())
  const auth = useAuthStore()
  auth.currentUser = {
    username: 'teacher',
    role: 'teacher',
    loginMethod: 'credentials',
    church: CHURCH
  }
  const courses = useCoursesStore()
  courses.addLecturer('張講師', '牧師', [], CHURCH, 'teacher')
  const lecturerId = courses.lecturers.at(-1)!.id
  const bookings = useBookingsStore()
  const book = (teacherUsername: string, students: string[], at: string, confirm = true) => {
    const s = bookings.createSession({
      courseId: 'bible-01',
      courseTitle: '聖經時觀',
      lecturerId,
      lecturerName: '張講師',
      lecturerTitle: '牧師',
      teacherUsername,
      proposedAt: at,
      durationMinutes: 90,
      prep: { scriptures: [], readingNotes: '', materials: '' },
      studentUsernames: students,
      church: CHURCH
    })
    if (confirm) bookings.updateSessionStatus(s.id, 'confirmed', { confirmedAt: at })
    return s
  }
  return { ...lectures, bookings, book }
}

describe('useMyLectures', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('merges bookings of one course and time, and counts what is left to record', () => {
    const { lectures, bookings, book } = setupLecturer()
    const a = book('teacher', ['s1', 's2'], '2020-05-01T10:00')
    book('tf', ['g1'], '2020-05-01T10:00')
    bookings.updateAttendee(a.id, 's1', { attendanceStatus: 'attended' })

    expect(lectures.value).toHaveLength(1)
    expect(lectures.value[0].teacherUsernames).toEqual(['teacher', 'tf'])
    expect(lectures.value[0].attendees).toHaveLength(3)
    expect(lectures.value[0].unrecorded).toBe(2)
  })

  it('reminds only about past, confirmed lectures with attendance left to record', () => {
    const { awaitingAttendance, past, upcoming, bookings, book } = setupLecturer()
    const due = book('teacher', ['s1'], '2020-05-01T10:00')
    const done = book('teacher', ['s2'], '2020-06-01T10:00')
    bookings.updateAttendee(done.id, 's2', { attendanceStatus: 'absent' })
    book('teacher', ['s3'], '2020-07-01T10:00', false) // time never confirmed
    book('teacher', ['s4'], '2099-01-01T10:00') // not held yet

    expect(past.value).toHaveLength(3)
    expect(upcoming.value).toHaveLength(1)
    expect(awaitingAttendance.value.map((l) => l.time)).toEqual([due.proposedAt])
  })

  it('starts reminding once a lecture is over, without anything else changing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2030, 0, 1, 9, 59))
    const { awaitingAttendance, book } = setupLecturer()
    book('teacher', ['s1'], '2030-01-01T10:00')
    expect(awaitingAttendance.value).toHaveLength(0)

    vi.advanceTimersByTime(2 * 60_000)
    await nextTick()
    expect(awaitingAttendance.value).toHaveLength(1)
  })

  it('has nothing for someone signed out or not linked to a lecturer', () => {
    const { lectures, book } = setupLecturer()
    book('teacher', ['s1'], '2020-05-01T10:00')
    useAuthStore().currentUser = {
      username: 'pastor',
      role: 'pastor',
      loginMethod: 'credentials',
      church: CHURCH
    }
    expect(lectures.value).toEqual([])
    useAuthStore().currentUser = null
    expect(lectures.value).toEqual([])
  })
})
