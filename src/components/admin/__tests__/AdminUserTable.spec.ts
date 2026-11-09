import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AdminUserTable from '@/components/admin/AdminUserTable.vue'
import { useAuthStore, DEFAULT_RESET_PASSWORD } from '@/stores/auth'
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

  it('keeps a lecturer link between teacher and pastor, and drops it for other roles', async () => {
    const { wrapper } = mountAsAdmin()
    const courses = useCoursesStore()
    courses.addLecturer('王牧師', '牧師', [], '愛與話語', 'pastor')
    const linked = () => courses.lecturers.find((l) => l.name === '王牧師')?.linkedUsername
    await wrapper.vm.$nextTick()

    await row(wrapper, 'pastor').find('select:not(.gender-select)').setValue('teacher')
    expect(linked()).toBe('pastor')
    await row(wrapper, 'pastor').find('select:not(.gender-select)').setValue('student')
    expect(linked()).toBeUndefined()
  })

  it('marks accounts that sign in with Google or LINE', async () => {
    const { wrapper } = mountAsAdmin()
    const auth = useAuthStore()
    auth.usersDb.amy = {
      passwordHash: '',
      role: 'student',
      church: '愛與話語',
      loginMethod: 'line'
    }
    await wrapper.vm.$nextTick()
    expect(row(wrapper, 'amy').text()).toContain(
      t('admin.userList.signsInWith', { method: 'LINE' })
    )
    expect(row(wrapper, 'student').find('.social-login-tag').exists()).toBe(false)
  })

  it('resets a password to the default only after confirming, and asks for a new one at sign-in', async () => {
    const { wrapper, auth } = mountAsAdmin()
    auth.usersDb.teacher.passwordHash = 'Mine#2026' // not the default, so a reset shows
    await wrapper.vm.$nextTick()
    const reset = row(wrapper, 'teacher').find('.reset-pwd-btn')
    expect(reset.attributes('aria-label')).toBe(t('a11y.resetPasswordFor', { username: 'teacher' }))

    await reset.trigger('click')
    resolveConfirm(false)
    await flushPromises()
    expect(auth.usersDb.teacher.passwordHash).toBe('Mine#2026')
    expect(auth.usersDb.teacher.mustChangePassword).toBeUndefined()

    await reset.trigger('click')
    resolveConfirm(true)
    await flushPromises()
    expect(auth.usersDb.teacher.passwordHash).toBe(DEFAULT_RESET_PASSWORD)
    expect(auth.usersDb.teacher.mustChangePassword).toBe(true)
    expect(toastTexts().at(-1)).toBe(
      t('admin.userList.resetPwdSuccess', { username: 'teacher', pwd: DEFAULT_RESET_PASSWORD })
    )
  })

  it('gives a Google / LINE account no password: it has none to reset', async () => {
    const { wrapper, auth } = mountAsAdmin()
    auth.usersDb.amy = {
      passwordHash: '',
      role: 'student',
      church: '愛與話語',
      loginMethod: 'google'
    }
    await wrapper.vm.$nextTick()
    const reset = row(wrapper, 'amy').find('.reset-pwd-btn')
    expect(reset.attributes('disabled')).toBeDefined()
    expect(reset.attributes('title')).toBe(
      t('admin.userList.noPasswordToReset', { method: 'Google' })
    )
    // and the store refuses too, so the known default can't be used to sign in as them
    expect(auth.adminResetPassword('amy').success).toBe(false)
    expect(auth.usersDb.amy.passwordHash).toBe('')
    expect(auth.login('amy', DEFAULT_RESET_PASSWORD).success).toBe(false)
  })

  it('keeps an account when deleting is cancelled, and clears its page limits when deleted', async () => {
    const { wrapper, auth } = mountAsAdmin()
    useCoursesStore().toggleRestriction('s2', '/student')
    await wrapper.vm.$nextTick()
    const del = row(wrapper, 's2').find('.delete-btn')
    expect(del.attributes('aria-label')).toBe(t('a11y.deleteUser', { username: 's2' }))

    await del.trigger('click')
    resolveConfirm(false)
    await flushPromises()
    expect(auth.usersDb.s2).toBeDefined()

    await del.trigger('click')
    resolveConfirm(true)
    await flushPromises()
    expect(useCoursesStore().restrictionsDb.s2).toBeUndefined()
    // its name stays taken: what was kept under it must not go to someone new
    expect(auth.isUsernameTaken('s2')).toBe(true)
    expect(toastTexts()).toContain(t('admin.userList.deletedToast', { username: 's2' }))
  })

  it('limits which pages someone may open', async () => {
    const { wrapper } = mountAsAdmin()
    await wrapper.vm.$nextTick()
    const [student, teacher] = row(wrapper, 'teacher').findAll<HTMLInputElement>(
      'input[type="checkbox"]'
    )
    await teacher.setValue(true)
    const courses = useCoursesStore()
    expect(courses.isPageRestricted('teacher', '/teacher')).toBe(true)
    expect(courses.isPageRestricted('teacher', '/student')).toBe(false)
    await student.setValue(true)
    await teacher.setValue(false)
    expect(courses.isPageRestricted('teacher', '/student')).toBe(true)
    expect(courses.isPageRestricted('teacher', '/teacher')).toBe(false)
  })

  it("doesn't let the admin change, limit, reset or delete their own account", async () => {
    const { wrapper } = mountAsAdmin()
    await wrapper.vm.$nextTick()
    const me = row(wrapper, 'admin')
    expect(me.text()).toContain(t('admin.userList.me'))
    const controls = me.findAll('select, input, button')
    expect(controls.length).toBeGreaterThanOrEqual(5)
    for (const c of controls) expect(c.attributes('disabled'), c.html()).toBeDefined()
  })
})
