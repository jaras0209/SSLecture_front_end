import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AdminUserTable from '@/components/admin/AdminUserTable.vue'
import { useAuthStore } from '@/stores/auth'
import { resolveConfirm } from '@/composables/useToast'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import { mountWith, toastTexts, t } from '@/__tests__/helpers'

function mountAsAdmin() {
  const result = mountWith(AdminUserTable)
  const auth = useAuthStore()
  auth.currentUser = { username: 'admin', role: 'admin', loginMethod: 'credentials' }
  auth.usersDb.s2 = { passwordHash: 'x', role: 'student', church: '愛與話語' }
  auth.bindChild('parent', 's2')
  return { ...result, auth }
}

const row = (wrapper: ReturnType<typeof mountWith>['wrapper'], username: string) =>
  wrapper.findAll('tbody tr').find((tr) => tr.find('.username-cell').text().includes(username))!

describe('AdminUserTable', () => {
  it("removes a deleted student from their parents' accounts", async () => {
    const { wrapper, auth } = mountAsAdmin()
    await wrapper.vm.$nextTick()
    await row(wrapper, 's2').find('.delete-btn').trigger('click')
    resolveConfirm(true)
    await flushPromises()
    expect(auth.usersDb.s2).toBeUndefined()
    expect(auth.childrenOf('parent')).toEqual(['student'])
  })

  it('unbinds a student from their parents when they stop being a student', async () => {
    const { wrapper, auth } = mountAsAdmin()
    await wrapper.vm.$nextTick()
    await row(wrapper, 's2').find('select').setValue('teacher')
    expect(auth.usersDb.s2.role).toBe('teacher')
    expect(auth.parentsOf('s2')).toEqual([])
  })

  it('offers a gender setting for teachers and students only', async () => {
    const { wrapper, auth } = mountAsAdmin()
    await wrapper.vm.$nextTick()
    expect(row(wrapper, 'teacher').find('.gender-select').exists()).toBe(true)
    expect(row(wrapper, 'parent').find('.gender-select').exists()).toBe(false)
    expect(row(wrapper, 'pastor').find('.gender-select').exists()).toBe(false)

    await row(wrapper, 's2').find('.gender-select').setValue('male')
    expect(auth.usersDb.s2.gender).toBe('male')
  })

  it('cleans up after a deleted teacher and tells the admin', async () => {
    const { wrapper } = mountAsAdmin()
    const courses = useCoursesStore()
    const bookings = useBookingsStore()
    courses.assignStudentCaretaker('student', 'teacher', 'teacher')
    courses.addLecturer('teacher 本人', '講師', [], '愛與話語', 'teacher')
    const booking = (status: 'pending' | 'completed') => {
      const s = bookings.createSession({
        courseId: 'bible-01',
        courseTitle: '聖經時觀',
        lecturerId: 'l1',
        lecturerName: '張牧師',
        lecturerTitle: '牧師',
        teacherUsername: 'teacher',
        proposedAt: '2099-01-10T10:00',
        durationMinutes: 90,
        prep: { scriptures: [], readingNotes: '', materials: '' },
        studentUsernames: ['student'],
        church: '愛與話語'
      })
      if (status === 'completed') bookings.completeSession(s.id, '')
      return s
    }
    const upcoming = booking('pending')
    const past = booking('completed')
    await wrapper.vm.$nextTick()

    await row(wrapper, 'teacher').find('.delete-btn').trigger('click')
    resolveConfirm(true)
    await flushPromises()

    expect(courses.getStudentCaretaker('student', 'teacher')).toBe('')
    expect(courses.lecturers.find((l) => l.name === 'teacher 本人')?.linkedUsername).toBeUndefined()
    expect(bookings.sessionsDb[upcoming.id]).toMatchObject({
      status: 'cancelled',
      cancelReason: t('admin.cleanup.cancelReasonDeleted')
    })
    expect(bookings.sessionsDb[past.id].status).toBe('completed')
    expect(toastTexts().at(-1)).toBe(
      t('admin.cleanup.summary', { mentors: 1, lecturers: 1, bookings: 1 })
    )
  })

  it('releases a pastor’s assignments when they change role, and does nothing for the same role', async () => {
    const { wrapper } = mountAsAdmin()
    const courses = useCoursesStore()
    courses.assignStudentCaretaker('student', 'pastor', 'pastor')
    await wrapper.vm.$nextTick()

    await row(wrapper, 'pastor').find('select').setValue('pastor') // unchanged
    expect(courses.getStudentCaretaker('student', 'pastor')).toBe('pastor')

    await row(wrapper, 'pastor').find('select').setValue('teacher')
    expect(courses.getStudentCaretaker('student', 'pastor')).toBe('')
  })
})
