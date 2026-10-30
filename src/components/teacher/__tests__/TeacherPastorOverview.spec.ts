import { describe, it, expect } from 'vitest'
import TeacherPastorOverview from '@/components/teacher/TeacherPastorOverview.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { mountWith } from '@/__tests__/helpers'

const OTHER = '主大明'

function mountAsPastor() {
  const result = mountWith(TeacherPastorOverview)
  const auth = useAuthStore()
  const church = auth.usersDb.pastor.church!
  auth.currentUser = { username: 'pastor', role: 'pastor', loginMethod: 'credentials', church }
  // One more of each role in this church, and one of each in another church
  auth.usersDb.s2 = { passwordHash: 'x', role: 'student', church }
  auth.usersDb.t2 = { passwordHash: 'x', role: 'teacher', church }
  auth.usersDb.p2 = { passwordHash: 'x', role: 'parent', church }
  auth.usersDb.sx = { passwordHash: 'x', role: 'student', church: OTHER }
  auth.usersDb.tx = { passwordHash: 'x', role: 'teacher', church: OTHER }
  auth.usersDb.px = { passwordHash: 'x', role: 'parent', church: OTHER }
  return { ...result, auth, church }
}

const rowUsers = (wrapper: ReturnType<typeof mountWith>['wrapper']) =>
  wrapper.findAll('.match-table tbody tr').map((tr) => tr.text())

describe('TeacherPastorOverview', () => {
  it("lists only the pastor's own church", async () => {
    const { wrapper } = mountAsPastor()
    await wrapper.vm.$nextTick()
    const [students, teachers] = wrapper.findAll('.stat-val').map((s) => s.text())
    expect(students).toBe('2') // student, s2
    expect(teachers).toBe('2') // teacher, t2

    const rows = rowUsers(wrapper)
    expect(rows.some((r) => r.includes('s2'))).toBe(true)
    expect(rows.some((r) => r.includes('sx'))).toBe(false)

    const firstRow = wrapper.findAll('.match-table tbody tr')[0]
    const [teacherSelect, parentSelect] = firstRow.findAll('select')
    const options = (s: typeof teacherSelect) =>
      s.findAll('option').map((o) => o.attributes('value'))
    expect(options(teacherSelect)).toEqual(['', 'teacher', 't2'])
    expect(options(parentSelect)).toEqual(['', 'parent', 'p2'])
  })

  it('assigns a mentor teacher to a student', async () => {
    const { wrapper } = mountAsPastor()
    await wrapper.vm.$nextTick()
    const row = wrapper.findAll('.match-table tbody tr').find((tr) => tr.text().includes('s2'))!
    await row.findAll('select')[0].setValue('t2')
    expect(useCoursesStore().getStudentCaretaker('s2', 'teacher')).toBe('t2')
    expect(useCoursesStore().getStudentsManagedByTeacher('t2')).toEqual(['s2'])
  })

  it('moves a student from one parent to another, and the old parent no longer has the child', async () => {
    const { wrapper, auth } = mountAsPastor()
    await wrapper.vm.$nextTick()
    const row = () =>
      wrapper.findAll('.match-table tbody tr').find((tr) => tr.text().includes('s2'))!

    await row().findAll('select')[1].setValue('parent')
    expect(auth.usersDb.parent.childUsernames).toContain('s2')

    await row().findAll('select')[1].setValue('p2')
    expect(auth.usersDb.p2.childUsernames).toEqual(['s2'])
    expect(auth.usersDb.parent.childUsernames).not.toContain('s2')

    await row().findAll('select')[1].setValue('') // unassign
    expect(useCoursesStore().getStudentCaretaker('s2', 'parent')).toBeFalsy()
    expect(auth.usersDb.p2.childUsernames).not.toContain('s2')
  })
})
