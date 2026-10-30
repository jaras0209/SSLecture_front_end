import { describe, it, expect } from 'vitest'
import { useStudentList } from '@/composables/useStudentList'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { withSetup } from '@/__tests__/helpers'

const signIn = (username: string) => {
  const auth = useAuthStore()
  const u = auth.usersDb[username]
  auth.currentUser = {
    username,
    role: u.role,
    loginMethod: 'credentials',
    church: u.church,
    childUsernames: u.childUsernames
  }
}

describe('useStudentList()', () => {
  it("lists the students of the teacher's own church only", () => {
    const { studentsList } = withSetup(() => useStudentList())
    const auth = useAuthStore()
    auth.usersDb.s2 = {
      passwordHash: 'x',
      role: 'student',
      church: '主大明',
      realName: '李同學',
      gender: 'male'
    }
    auth.usersDb.s3 = {
      passwordHash: 'x',
      role: 'student',
      church: auth.usersDb.teacher.church,
      gender: 'male'
    }
    signIn('teacher')

    expect(studentsList.value.map((s) => s.username).sort()).toEqual(['s3', 'student'])
  })

  it("shows a teacher only students of their gender, following the pastor's changes", () => {
    const { studentsList } = withSetup(() => useStudentList())
    const auth = useAuthStore()
    const church = auth.usersDb.teacher.church
    auth.usersDb.girl = { passwordHash: 'x', role: 'student', church, gender: 'female' }
    auth.usersDb.unset = { passwordHash: 'x', role: 'student', church }
    signIn('teacher') // male, like the demo student
    const names = () => studentsList.value.map((s) => s.username)
    expect(names()).toEqual(['student'])

    auth.setGender('unset', 'male')
    expect(names()).toEqual(['student', 'unset'])
    auth.setGender('teacher', 'female') // applies without signing in again
    expect(names()).toEqual(['girl'])
    auth.setGender('teacher', undefined)
    expect(names()).toEqual([])
  })

  it('lists only their bound children for a parent', () => {
    const { studentsList } = withSetup(() => useStudentList())
    const auth = useAuthStore()
    auth.usersDb.s3 = { passwordHash: 'x', role: 'student', church: auth.usersDb.parent.church }
    signIn('parent') // bound to "student"

    expect(studentsList.value.map((s) => s.username)).toEqual(['student'])
  })

  it("follows a pastor's change to a parent's children without signing in again", () => {
    const { studentsList } = withSetup(() => useStudentList())
    const auth = useAuthStore()
    auth.usersDb.s3 = { passwordHash: 'x', role: 'student', church: auth.usersDb.parent.church }
    signIn('parent') // the session copy lists only "student"

    auth.bindChild('parent', 's3')
    expect(studentsList.value.map((s) => s.username)).toEqual(['student', 's3'])
    auth.unbindChild('parent', 'student')
    expect(studentsList.value.map((s) => s.username)).toEqual(['s3'])
  })

  it('summarises progress across all courses', () => {
    const { studentsList } = withSetup(() => useStudentList())
    const courses = useCoursesStore()
    const [first, second] = courses.courses
    courses.addListenSession('student', first.id, {
      lecturer: 'L',
      listenedAt: '2026-10-01T10:00',
      notes: ''
    })
    courses.addListenSession('student', second.id, {
      lecturer: 'L',
      listenedAt: '2026-10-02T10:00',
      notes: ''
    })
    signIn('teacher')

    const me = studentsList.value.find((s) => s.username === 'student')!
    expect(me.completedCount).toBe(2)
    expect(me.totalProgressPercent).toBe(Math.round((2 * 100) / courses.courses.length))
    expect(me.records).toHaveLength(courses.courses.length)
    expect(me.records.find((r) => r.courseId === first.id)?.completed).toBe(true)
    expect(me.lastActive).toBeTruthy()
    expect(me.avatarUrl).toBeTruthy()
  })

  it('includes legacy progress records without an account only when the viewer has no church', () => {
    const { studentsList } = withSetup(() => useStudentList())
    const courses = useCoursesStore()
    courses.addListenSession('legacy', courses.courses[0].id, {
      lecturer: 'L',
      listenedAt: '2026-10-01T10:00',
      notes: ''
    })

    signIn('teacher')
    expect(studentsList.value.some((s) => s.username === 'legacy')).toBe(false)

    useAuthStore().currentUser = { username: 'x', role: 'pastor', loginMethod: 'credentials' } // no church
    expect(studentsList.value.some((s) => s.username === 'legacy')).toBe(true)
  })
})
