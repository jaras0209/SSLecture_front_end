import { describe, it, expect } from 'vitest'
import TeacherChurchBookings from '@/components/teacher/TeacherChurchBookings.vue'
import { useAuthStore } from '@/stores/auth'
import { useBookingsStore } from '@/stores/bookings'
import { mountWith, t } from '@/__tests__/helpers'

const CHURCH = '愛與話語'

/** A pastor's view of the church: bookings by a male and a female teacher, and one elsewhere */
function mountForChurch() {
  const result = mountWith(TeacherChurchBookings, { props: { church: CHURCH } })
  const auth = useAuthStore()
  const account = (role: 'teacher' | 'student', gender: 'male' | 'female', realName: string) => ({
    passwordHash: 'x',
    role,
    church: CHURCH,
    gender,
    realName
  })
  auth.usersDb.tf = account('teacher', 'female', '林老師')
  auth.usersDb.girl = account('student', 'female', '陳姊妹')

  const bookings = useBookingsStore()
  const book = (teacherUsername: string, students: string[], proposedAt: string, church = CHURCH) =>
    bookings.createSession({
      courseId: 'bible-01',
      courseTitle: '聖經時觀',
      lecturerId: 'l1',
      lecturerName: '張牧師',
      lecturerTitle: '牧師',
      teacherUsername,
      proposedAt,
      durationMinutes: 90,
      prep: { scriptures: [], readingNotes: '', materials: '' },
      studentUsernames: students,
      church
    })
  const older = book('teacher', ['student'], '2099-01-10T10:00')
  const newer = book('tf', ['girl'], '2099-02-10T10:00')
  book('teacher', ['student'], '2099-03-10T10:00', '別的教會')
  // Confirmed for a later time than the other booking, so it is listed first
  bookings.updateSessionStatus(older.id, 'confirmed', { confirmedAt: '2099-03-01T10:00' })
  bookings.updateSessionStatus(older.id, 'cancelled', { cancelReason: '講師請假' })
  bookings.updateAttendee(newer.id, 'girl', { attendanceStatus: 'attended' })
  return { ...result, older, newer }
}

describe('TeacherChurchBookings', () => {
  it("lists the church's bookings of every teacher and student, latest (confirmed) time first", async () => {
    const { wrapper, older, newer } = mountForChurch()
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('tbody tr[data-session]')
    expect(rows.map((r) => r.attributes('data-session'))).toEqual([older.id, newer.id])
    // Intl may use a narrow or non-breaking space between date and time
    expect(rows[0].text().replace(/\s+/g, ' ')).toContain('2099/03/01 10:00')
    expect(rows[0].text()).toContain(t('booking.status.cancelled'))
    expect(rows[0].text()).toContain('講師請假')
    expect(rows[1].text()).toContain('林老師')
    expect(rows[1].text()).toContain('陳姊妹')
    expect(rows[1].text()).toContain(t('student.attendance.attended'))
    // read-only: nothing to press but the filters
    expect(wrapper.findAll('tbody button')).toHaveLength(0)
  })

  it('filters by status, with counts', async () => {
    const { wrapper, newer } = mountForChurch()
    await wrapper.vm.$nextTick()

    const pending = wrapper
      .findAll('.status-filter-btn')
      .find((b) => b.text().startsWith(t('booking.status.pending')))!
    expect(pending.text()).toContain('1')
    await pending.trigger('click')
    expect(pending.attributes('aria-pressed')).toBe('true')
    const rows = wrapper.findAll('tbody tr[data-session]')
    expect(rows.map((r) => r.attributes('data-session'))).toEqual([newer.id])

    const completed = wrapper
      .findAll('.status-filter-btn')
      .find((b) => b.text().startsWith(t('booking.status.completed')))!
    await completed.trigger('click')
    expect(wrapper.find('.empty-row').text()).toBe(t('teacher.churchBookings.empty'))
  })
})
