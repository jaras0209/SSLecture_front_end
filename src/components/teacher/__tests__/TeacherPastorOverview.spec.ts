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
    // "student" is already bound to "parent" (on the parent account), so only p2 is left to add
    expect(firstRow.findAll('.parent-chip').map((c) => c.text())).toEqual([
      expect.stringContaining('parent')
    ])
    expect(options(parentSelect)).toEqual(['', 'p2'])
  })

  it('assigns a mentor teacher to a student', async () => {
    const { wrapper } = mountAsPastor()
    await wrapper.vm.$nextTick()
    const row = wrapper.findAll('.match-table tbody tr').find((tr) => tr.text().includes('s2'))!
    await row.findAll('select')[0].setValue('t2')
    expect(useCoursesStore().getStudentCaretaker('s2', 'teacher')).toBe('t2')
    expect(useCoursesStore().getStudentsManagedByTeacher('t2')).toEqual(['s2'])
  })

  it('binds several parents to a student and unbinds them, on the parent accounts', async () => {
    const { wrapper, auth } = mountAsPastor()
    await wrapper.vm.$nextTick()
    const row = () =>
      wrapper.findAll('.match-table tbody tr').find((tr) => tr.text().includes('s2'))!
    const chips = () =>
      row()
        .findAll('.parent-chip')
        .map((c) => c.text().replace('×', '').trim())
    const addParent = (pa: string) => row().find('.parent-bindings select').setValue(pa)

    expect(chips()).toEqual([])
    await addParent('parent')
    await addParent('p2')
    expect(chips()).toEqual(['parent', 'p2'])
    expect(auth.parentsOf('s2')).toEqual(['parent', 'p2'])
    expect(auth.usersDb.p2.childUsernames).toEqual(['s2'])
    expect(row().find('.parent-bindings select').exists()).toBe(false) // nobody left to add

    await row().findAll('.parent-chip-remove')[0].trigger('click')
    expect(chips()).toEqual(['p2'])
    expect(auth.usersDb.parent.childUsernames).not.toContain('s2')
    expect(auth.usersDb.parent.childUsernames).toContain('student') // other children untouched
  })
})
