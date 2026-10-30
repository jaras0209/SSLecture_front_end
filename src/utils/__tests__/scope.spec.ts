import { describe, it, expect } from 'vitest'
import { membersOf, canViewStudent, visibleStudents, type Viewer } from '@/utils/scope'

const members = {
  s1: { role: 'student', church: 'A' },
  t1: { role: 'teacher', church: 'A' },
  s2: { role: 'student', church: 'B' },
  s3: { role: 'student', church: 'A' },
  admin: { role: 'admin' }
}
const viewer = (role: Viewer['role'], church?: string, childUsernames?: string[]): Viewer => ({
  username: 'me',
  role,
  church,
  childUsernames
})

describe('membersOf', () => {
  it('lists accounts of one role in one church, in account order', () => {
    expect(membersOf(members, 'student', 'A')).toEqual(['s1', 's3'])
    expect(membersOf(members, 'teacher', 'A')).toEqual(['t1'])
    expect(membersOf(members, 'student', 'C')).toEqual([])
  })
})

describe('canViewStudent / visibleStudents', () => {
  it("lets teachers and pastors see their own church's students only", () => {
    for (const role of ['teacher', 'pastor'] as const) {
      expect(visibleStudents(viewer(role, 'A'), members)).toEqual(['s1', 's3'])
      expect(canViewStudent(viewer(role, 'A'), 's2', members)).toBe(false)
    }
  })

  it('never lists accounts that are not students', () => {
    expect(canViewStudent(viewer('pastor', 'A'), 't1', members)).toBe(false)
    expect(canViewStudent(viewer('pastor'), 'admin', members)).toBe(false)
  })

  it('lets parents see only their bound children, in binding order', () => {
    const parent = viewer('parent', 'A', ['s3', 's2'])
    expect(visibleStudents(parent, members)).toEqual(['s3', 's2'])
    expect(canViewStudent(parent, 's1', members)).toBe(false)
  })

  it('lets a viewer without a church see every student, legacy records included', () => {
    const central = viewer('pastor')
    expect(visibleStudents(central, members, ['legacy', 's1'])).toEqual([
      's1',
      's2',
      's3',
      'legacy'
    ])
    expect(visibleStudents(viewer('teacher', 'A'), members, ['legacy'])).toEqual(['s1', 's3'])
  })
})
