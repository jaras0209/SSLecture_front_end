import { describe, it, expect } from 'vitest'
import TeacherLectureSchedule from '@/components/teacher/TeacherLectureSchedule.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import { mountWith, toastTexts, t } from '@/__tests__/helpers'

/**
 * The lecturer `lect` (a male teacher account) is linked to a lecturer record.
 * A male and a female teacher each book their own students for the same lecture.
 */
function mountAsLecturer() {
  const result = mountWith(TeacherLectureSchedule)
  const auth = useAuthStore()
  const church = auth.usersDb.teacher.church!
  const account = (role: 'teacher' | 'student', gender: 'male' | 'female', realName: string) => ({
    passwordHash: 'x',
    role,
    church,
    gender,
    realName
  })
  auth.usersDb.lect = account('teacher', 'male', '王講師')
  auth.usersDb.tf = account('teacher', 'female', '林老師')
  auth.usersDb.girl = account('student', 'female', '陳姊妹')
  auth.currentUser = { username: 'lect', role: 'teacher', loginMethod: 'credentials', church }

  const courses = useCoursesStore()
  const course = courses.courses[0]
  courses.addLecturer('王講師', '牧師', [course.id], church, 'lect')
  courses.addLecturer('別的講師', '牧師', [course.id], church)
  const [mine, other] = courses.lecturers.slice(-2)

  const bookings = useBookingsStore()
  const book = (
    teacherUsername: string,
    students: string[],
    proposedAt = '2099-01-10T10:00',
    lecturerId = mine.id
  ) =>
    bookings.createSession({
      courseId: course.id,
      courseTitle: course.title,
      lecturerId,
      lecturerName: '王講師',
      lecturerTitle: '牧師',
      teacherUsername,
      proposedAt,
      durationMinutes: 90,
      prep: { scriptures: [], readingNotes: '', materials: '' },
      studentUsernames: students,
      church
    })
  return { ...result, bookings, book, other }
}

describe('TeacherLectureSchedule', () => {
  it('merges the bookings of one lecture and shows every student, regardless of gender', async () => {
    const ctx = mountAsLecturer()
    const men = ctx.book('teacher', ['student'])
    const women = ctx.book('tf', ['girl'])
    ctx.bookings.updateSessionStatus(men.id, 'confirmed', { confirmedAt: men.proposedAt })
    ctx.bookings.updateSessionStatus(women.id, 'confirmed', { confirmedAt: women.proposedAt })
    ctx.book('teacher', ['student'], '2099-01-10T10:00', ctx.other.id) // someone else lectures
    const cancelled = ctx.book('teacher', ['student'], '2099-02-01T10:00')
    ctx.bookings.updateSessionStatus(cancelled.id, 'cancelled', { cancelReason: 'x' })
    await ctx.wrapper.vm.$nextTick()

    const cards = ctx.wrapper.findAll('.lecture-card')
    expect(cards).toHaveLength(1)
    const text = cards[0].text()
    expect(text).toContain('陳姊妹')
    expect(cards[0].findAll('.lecture-attendee')).toHaveLength(2)
    expect(text).toContain(t('teacher.lecture.bookedBy', { names: 'teacher、林老師' }))
  })

  it('records attendance once the time is confirmed', async () => {
    const ctx = mountAsLecturer()
    const pending = ctx.book('tf', ['girl'], '2099-03-01T10:00')
    const confirmed = ctx.book('tf', ['girl'])
    ctx.bookings.updateSessionStatus(confirmed.id, 'confirmed', {
      confirmedAt: confirmed.proposedAt
    })
    await ctx.wrapper.vm.$nextTick()

    const [first, second] = ctx.wrapper.findAll('.lecture-card')
    // Upcoming lectures come soonest first; the pending one cannot be recorded yet
    expect(first.text()).not.toContain(t('teacher.lecture.timePending'))
    expect(second.text()).toContain(t('teacher.lecture.timePending'))
    expect(second.findAll('button')).toHaveLength(0)

    await first.findAll('button')[1].trigger('click')
    const attendee = ctx.bookings.getAttendeesForSession(confirmed.id)[0]
    expect(attendee.attendanceStatus).toBe('absent')
    expect(ctx.bookings.getAttendeesForSession(pending.id)[0].attendanceStatus).toBe('invited')
    expect(first.findAll('button')[1].attributes('aria-pressed')).toBe('true')
    expect(toastTexts().at(-1)).toBe(t('teacher.lecture.recorded', { name: '陳姊妹' }))
  })

  it('says so when there are no lectures', () => {
    const ctx = mountAsLecturer()
    expect(ctx.wrapper.text()).toContain(t('teacher.lecture.empty'))
  })

  it('points out finished lectures whose attendance is not recorded yet', async () => {
    const ctx = mountAsLecturer()
    const due = ctx.book('teacher', ['student'], '2020-05-01T10:00')
    ctx.bookings.updateSessionStatus(due.id, 'confirmed', { confirmedAt: due.proposedAt })
    await ctx.wrapper.vm.$nextTick()

    expect(ctx.wrapper.find('.due-banner').text()).toContain(
      t('teacher.lecture.dueBanner', { n: 1 })
    )
    const card = ctx.wrapper.find('.lecture-card')
    expect(card.classes()).toContain('lecture-due')
    expect(card.text()).toContain(t('teacher.lecture.dueTag', { n: 1 }))

    await card.findAll('button')[0].trigger('click') // attended
    expect(ctx.wrapper.find('.due-banner').exists()).toBe(false)
    expect(ctx.wrapper.find('.lecture-card').classes()).not.toContain('lecture-due')
  })
})
