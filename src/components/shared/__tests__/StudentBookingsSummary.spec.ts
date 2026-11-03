import { describe, it, expect, afterEach, vi } from 'vitest'
import StudentBookingsSummary from '@/components/shared/StudentBookingsSummary.vue'
import { useBookingsStore } from '@/stores/bookings'
import { mountPrepared, t } from '@/__tests__/helpers'

function book(proposedAt: string, students = ['student']) {
  return useBookingsStore().createSession({
    courseId: 'bible-01',
    courseTitle: `課程 ${proposedAt.slice(0, 10)}`,
    lecturerId: 'l1',
    lecturerName: '王講師',
    lecturerTitle: '牧師',
    teacherUsername: 'teacher',
    proposedAt,
    durationMinutes: 90,
    prep: { scriptures: [], readingNotes: '', materials: '' },
    studentUsernames: students,
    church: '愛與話語'
  })
}

describe('StudentBookingsSummary', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("lists a student's coming bookings soonest first and past ones latest first", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0))
    let ids: Record<string, string> = {}
    const { wrapper } = mountPrepared(
      StudentBookingsSummary,
      () => {
        const bookings = useBookingsStore()
        const later = book('2026-08-01T10:00')
        const sooner = book('2026-07-01T10:00')
        const held = book('2026-03-01T10:00')
        const older = book('2026-02-01T10:00')
        const cancelled = book('2026-09-01T10:00')
        book('2026-07-15T10:00', ['someone-else'])
        bookings.completeSession(held.id, '')
        bookings.updateAttendee(held.id, 'student', { attendanceStatus: 'attended' })
        bookings.updateSessionStatus(cancelled.id, 'cancelled', { cancelReason: '講師請假' })
        ids = {
          later: later.id,
          sooner: sooner.id,
          held: held.id,
          older: older.id,
          cancelled: cancelled.id
        }
      },
      { props: { username: 'student' } }
    )
    const lists = wrapper.findAll('.summary-list')
    const order = (i: number) =>
      lists[i].findAll('.summary-item').map((li) => li.attributes('data-session'))
    expect(wrapper.findAll('.part-title').map((h) => h.text())).toEqual([
      t('teacher.drawer.bookings.upcoming'),
      t('teacher.drawer.bookings.past')
    ])
    expect(order(0)).toEqual([ids.sooner, ids.later])
    expect(order(1)).toEqual([ids.cancelled, ids.held, ids.older])

    const held = wrapper.find(`[data-session="${ids.held}"]`).text()
    expect(held).toContain(t('booking.status.completed'))
    expect(held).toContain(t('student.attendance.attended'))
    const cancelled = wrapper.find(`[data-session="${ids.cancelled}"]`).text()
    expect(cancelled).toContain(t('teacher.drawer.bookings.cancelReason', { reason: '講師請假' }))
    expect(cancelled).not.toContain(t('teacher.drawer.bookings.attendance'))
  })

  it('says so when the student has no bookings', () => {
    const { wrapper } = mountPrepared(StudentBookingsSummary, () => {}, {
      props: { username: 'student' }
    })
    expect(wrapper.text()).toContain(t('teacher.drawer.bookings.empty'))
  })
})
