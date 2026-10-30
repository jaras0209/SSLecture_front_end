import { describe, it, expect, afterEach } from 'vitest'
import { DOMWrapper } from '@vue/test-utils'
import TeacherBookingPanel from '@/components/teacher/TeacherBookingPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import { mountWith, toastTexts, t } from '@/__tests__/helpers'

// The modals are teleported to <body>
const $ = (sel: string) => new DOMWrapper(document.body).find(sel)
const $$ = (sel: string) => new DOMWrapper(document.body).findAll(sel)

function mountAsTeacher() {
  const result = mountWith(TeacherBookingPanel, { attachTo: document.body })
  const auth = useAuthStore()
  const church = auth.usersDb.teacher.church!
  auth.currentUser = { username: 'teacher', role: 'teacher', loginMethod: 'credentials', church }
  // The demo teacher and student are both male; s2 too, so the teacher sees all three
  auth.usersDb.s2 = {
    passwordHash: 'x',
    role: 'student',
    church,
    realName: '李同學',
    gender: 'male'
  }
  const courses = useCoursesStore()
  const course = courses.courses[0]
  courses.addLecturer('測試講師', '牧師', [course.id], church)
  const lecturer = courses.lecturers.find((l) => l.name === '測試講師')!
  return { ...result, church, course, lecturer }
}

/** A booking made directly in the store, as if created earlier */
function existingBooking(ctx: ReturnType<typeof mountAsTeacher>, students = ['student', 's2']) {
  return useBookingsStore().createSession({
    courseId: ctx.course.id,
    courseTitle: ctx.course.title,
    lecturerId: ctx.lecturer.id,
    lecturerName: ctx.lecturer.name,
    lecturerTitle: ctx.lecturer.title,
    teacherUsername: 'teacher',
    proposedAt: '2099-01-10T10:00',
    durationMinutes: 90,
    prep: { scriptures: [], readingNotes: '', materials: '' },
    studentUsernames: students,
    church: ctx.church
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('TeacherBookingPanel', () => {
  it('validates and creates a booking with the chosen students', async () => {
    const ctx = mountAsTeacher()
    await ctx.wrapper.find('#btn-create-booking').trigger('click')
    await $('#btn-submit-booking').trigger('click')
    expect(toastTexts().at(-1)).toBe(t('teacher.booking.toastSelectCourse'))

    await $('#booking-course-select').setValue(ctx.course.id)
    await $('#booking-lecturer-select').setValue(ctx.lecturer.id)
    await $('#booking-time').setValue('2099-02-01T09:30')
    await $('#btn-submit-booking').trigger('click')
    expect(toastTexts().at(-1)).toBe(t('teacher.booking.noStudents'))

    await $$('.attendee-check-item input')[0].setValue(true)
    await $('#btn-add-scripture').trigger('click')
    await $('#btn-add-scripture').trigger('click')
    const verses = $$('.booking-modal-card .flex.gap-2 input')
    expect(verses).toHaveLength(2)
    await verses[0].setValue('約翰福音 3:16')
    await $('#btn-submit-booking').trigger('click')

    const [session] = useBookingsStore().getSessionsByTeacher('teacher')
    expect(session).toMatchObject({
      courseId: ctx.course.id,
      lecturerName: '測試講師',
      proposedAt: '2099-02-01T09:30',
      status: 'pending',
      church: ctx.church
    })
    expect(session.prep.scriptures).toEqual(['約翰福音 3:16']) // the blank one is dropped
    expect(useBookingsStore().getAttendeesForSession(session.id)).toHaveLength(1)
    expect(toastTexts().at(-1)).toBe(t('teacher.booking.toastCreated'))
    expect($('#booking-create-title').exists()).toBe(false) // modal closed
    expect(ctx.wrapper.findAll('.booking-card')).toHaveLength(1)
  })

  it("invites only students of the teacher's own church", async () => {
    const ctx = mountAsTeacher()
    useAuthStore().usersDb.sx = { passwordHash: 'x', role: 'student', church: '主大明' }
    await ctx.wrapper.find('#btn-create-booking').trigger('click')
    const offered = $$('.attendee-check-item input').map(
      (i) => (i.element as HTMLInputElement).value
    )
    expect(offered).toEqual(['student', 's2'])
  })

  it('invites only students of the same gender, and none while genders are missing', async () => {
    const ctx = mountAsTeacher()
    const auth = useAuthStore()
    auth.usersDb.girl = { passwordHash: 'x', role: 'student', church: ctx.church, gender: 'female' }
    auth.usersDb.unset = { passwordHash: 'x', role: 'student', church: ctx.church }
    await ctx.wrapper.find('#btn-create-booking').trigger('click')
    const offered = () =>
      $$('.attendee-check-item input').map((i) => (i.element as HTMLInputElement).value)
    expect(offered()).toEqual(['student', 's2'])

    auth.setGender('teacher', undefined)
    await ctx.wrapper.vm.$nextTick()
    expect(offered()).toEqual([])
  })

  it('leaves the names of students it may not see out of a mixed booking', async () => {
    const ctx = mountAsTeacher()
    const auth = useAuthStore()
    auth.usersDb.girl = {
      passwordHash: 'x',
      role: 'student',
      church: ctx.church,
      gender: 'female',
      realName: '小美'
    }
    const session = existingBooking(ctx, ['student', 'girl', 's2'])
    const bookings = useBookingsStore()
    await ctx.wrapper.vm.$nextTick()

    const card = ctx.wrapper.find('.booking-card')
    expect(card.findAll('.att-chip')).toHaveLength(2)
    expect(card.text()).not.toContain('小美')
    expect(card.find('.hidden-attendees-note').text()).toBe(t('gender.hiddenAttendees', { n: 1 }))

    // completing it records only the visible students; the hidden one is left as is
    bookings.updateSessionStatus(session.id, 'confirmed', { confirmedAt: session.proposedAt })
    await ctx.wrapper.vm.$nextTick()
    await ctx.wrapper.find('.booking-card-actions .btn-primary').trigger('click')
    expect($$('.complete-attendee-card')).toHaveLength(2)
    expect(document.body.textContent).not.toContain('小美')
    await $('#btn-submit-complete').trigger('click')
    const status = Object.fromEntries(
      bookings
        .getAttendeesForSession(session.id)
        .map((a) => [a.studentUsername, a.attendanceStatus])
    )
    expect(status).toEqual({ student: 'attended', girl: 'invited', s2: 'attended' })
  })

  it('only offers lecturers who teach the chosen course', async () => {
    const ctx = mountAsTeacher()
    useCoursesStore().addLecturer(
      '別門課講師',
      '講師',
      [useCoursesStore().courses[5].id],
      ctx.church
    )
    await ctx.wrapper.find('#btn-create-booking').trigger('click')
    await $('#booking-course-select').setValue(ctx.course.id)
    const options = $$('#booking-lecturer-select option').map((o) => o.text())
    expect(options.some((o) => o.includes('測試講師'))).toBe(true)
    expect(options.some((o) => o.includes('別門課講師'))).toBe(false)
  })

  it('confirms the time of a pending booking', async () => {
    const ctx = mountAsTeacher()
    const session = existingBooking(ctx)
    await ctx.wrapper.vm.$nextTick()
    await ctx.wrapper.find('.booking-card-actions .btn-outline').trigger('click')
    expect(($('#confirm-time-input').element as HTMLInputElement).value).toBe(session.proposedAt)

    await $('#confirm-time-input').setValue('2099-01-11T14:00')
    await $('#btn-submit-confirm').trigger('click')
    expect(useBookingsStore().sessionsDb[session.id]).toMatchObject({
      status: 'confirmed',
      confirmedAt: '2099-01-11T14:00'
    })
    expect(toastTexts().at(-1)).toBe(t('teacher.booking.toastTimeConfirmed'))
  })

  it('completes a booking with attendance and feedback per student', async () => {
    const ctx = mountAsTeacher()
    const session = existingBooking(ctx)
    const bookings = useBookingsStore()
    bookings.updateSessionStatus(session.id, 'confirmed', { confirmedAt: session.proposedAt })
    await ctx.wrapper.vm.$nextTick()
    await ctx.wrapper.find('.booking-card-actions .btn-primary').trigger('click')

    await $('#complete-session-notes').setValue('大家都很投入')
    const cards = $$('.complete-attendee-card')
    expect(cards).toHaveLength(2)
    await cards[1].findAll('.att-status-toggle button')[1].trigger('click') // second student absent
    await $('#btn-submit-complete').trigger('click')

    expect(bookings.sessionsDb[session.id]).toMatchObject({
      status: 'completed',
      teacherSessionNotes: '大家都很投入'
    })
    const statuses = Object.fromEntries(
      bookings
        .getAttendeesForSession(session.id)
        .map((a) => [a.studentUsername, a.attendanceStatus])
    )
    expect(statuses).toEqual({ student: 'attended', s2: 'absent' }) // invited defaults to attended
  })

  it('cancels a booking with the trimmed reason', async () => {
    const ctx = mountAsTeacher()
    const session = existingBooking(ctx)
    await ctx.wrapper.vm.$nextTick()
    await ctx.wrapper.find('.booking-card-actions .btn-danger').trigger('click')
    await $('#booking-cancel-reason').setValue('  時間衝突  ')
    await $('#btn-confirm-cancel').trigger('click')
    expect(useBookingsStore().sessionsDb[session.id]).toMatchObject({
      status: 'cancelled',
      cancelReason: '時間衝突'
    })
  })

  it('filters bookings by status and exposes the pending count', async () => {
    const ctx = mountAsTeacher()
    const a = existingBooking(ctx)
    existingBooking(ctx)
    useBookingsStore().updateSessionStatus(a.id, 'confirmed', { confirmedAt: a.proposedAt })
    await ctx.wrapper.vm.$nextTick()

    const tabs = ctx.wrapper.findAll('.booking-filter-tabs button')
    expect(tabs.map((b) => b.text())).toEqual(
      expect.arrayContaining([expect.stringContaining('2'), expect.stringContaining('1')])
    )
    await tabs[2].trigger('click') // confirmed
    expect(ctx.wrapper.findAll('.booking-card')).toHaveLength(1)
    expect(
      (ctx.wrapper.vm as unknown as { pendingBookingsCount: number }).pendingBookingsCount
    ).toBe(1)
  })
})
