import { describe, it, expect } from 'vitest'
import {
  membersOf,
  canViewStudent,
  visibleStudents,
  viewerOf,
  canMentor,
  lecturerIdsOf,
  canViewAttendee,
  type Viewer
} from '@/utils/scope'
import type { Gender } from '@/types/auth'

const members = {
  s1: { role: 'student', church: 'A', gender: 'male' as Gender },
  t1: { role: 'teacher', church: 'A', gender: 'male' as Gender },
  s2: { role: 'student', church: 'B', gender: 'male' as Gender },
  s3: { role: 'student', church: 'A', gender: 'female' as Gender },
  s4: { role: 'student', church: 'A' }, // gender not set
  t2: { role: 'teacher', church: 'A' }, // gender not set
  admin: { role: 'admin' }
}
const viewer = (role: Viewer['role'], church?: string, extra: Partial<Viewer> = {}): Viewer => ({
  username: 'me',
  role,
  church,
  ...extra
})

describe('membersOf', () => {
  it('lists accounts of one role in one church, in account order', () => {
    expect(membersOf(members, 'student', 'A')).toEqual(['s1', 's3', 's4'])
    expect(membersOf(members, 'teacher', 'A')).toEqual(['t1', 't2'])
    expect(membersOf(members, 'student', 'C')).toEqual([])
  })
})

describe('canViewStudent / visibleStudents', () => {
  it("lets teachers see only their own church's students of the same gender", () => {
    expect(visibleStudents(viewer('teacher', 'A', { gender: 'male' }), members)).toEqual(['s1'])
    expect(visibleStudents(viewer('teacher', 'A', { gender: 'female' }), members)).toEqual(['s3'])
    expect(canViewStudent(viewer('teacher', 'A', { gender: 'male' }), 's2', members)).toBe(false)
  })

  it('hides every student from a teacher without a gender, and students without one', () => {
    expect(visibleStudents(viewer('teacher', 'A'), members)).toEqual([])
    expect(canViewStudent(viewer('teacher', 'A', { gender: 'male' }), 's4', members)).toBe(false)
  })

  it("lets pastors see all of their own church's students, whatever the gender", () => {
    expect(visibleStudents(viewer('pastor', 'A'), members)).toEqual(['s1', 's3', 's4'])
    expect(canViewStudent(viewer('pastor', 'A'), 's2', members)).toBe(false)
  })

  it('never lists accounts that are not students', () => {
    expect(canViewStudent(viewer('pastor', 'A'), 't1', members)).toBe(false)
    expect(canViewStudent(viewer('pastor'), 'admin', members)).toBe(false)
  })

  it('lets parents see only their bound children, in binding order', () => {
    const parent = viewer('parent', 'A', { childUsernames: ['s3', 's2'] })
    expect(visibleStudents(parent, members)).toEqual(['s3', 's2'])
    expect(canViewStudent(parent, 's1', members)).toBe(false)
  })

  it('lets a viewer without a church see every student, legacy records included', () => {
    expect(visibleStudents(viewer('pastor'), members, ['legacy', 's1'])).toEqual([
      's1',
      's2',
      's3',
      's4',
      'legacy'
    ])
    // a legacy record has no gender, so teachers never see it
    expect(
      visibleStudents(viewer('teacher', 'A', { gender: 'male' }), members, ['legacy'])
    ).toEqual(['s1'])
  })
})

describe('viewerOf / canMentor', () => {
  it('builds a viewer from the account', () => {
    expect(viewerOf('t1', members)).toEqual({
      username: 't1',
      role: 'teacher',
      church: 'A',
      childUsernames: [],
      gender: 'male'
    })
    expect(viewerOf('nobody', members)).toBeUndefined()
  })

  it('lets a teacher mentor only the students they can see', () => {
    expect(canMentor('t1', 's1', members)).toBe(true)
    expect(canMentor('t1', 's3', members)).toBe(false) // other gender
    expect(canMentor('t2', 's1', members)).toBe(false) // teacher gender not set
    expect(canMentor('s1', 's1', members)).toBe(false) // not a teacher
  })
})

describe('lecturerIdsOf / canViewAttendee', () => {
  const lecturers = [
    { id: 'L1', linkedUsername: 't1' },
    { id: 'L2' }, // not linked to an account
    { id: 'L3', linkedUsername: 't1' }
  ]
  const t1 = viewerOf('t1', members)!

  it('finds the lecturer records linked to an account', () => {
    expect(lecturerIdsOf('t1', lecturers)).toEqual(['L1', 'L3'])
    expect(lecturerIdsOf('t2', lecturers)).toEqual([])
  })

  it('shows the lecturer every attendee of their own lectures, whatever the gender', () => {
    for (const student of ['s1', 's3', 's4']) {
      expect(canViewAttendee(t1, { lecturerId: 'L3' }, student, members, lecturers)).toBe(true)
    }
  })

  it('falls back to the usual rule for bookings they do not lecture', () => {
    const other = { lecturerId: 'L2' }
    expect(canViewAttendee(t1, other, 's1', members, lecturers)).toBe(true)
    expect(canViewAttendee(t1, other, 's3', members, lecturers)).toBe(false)
    expect(canViewAttendee(t1, other, 's4', members, lecturers)).toBe(false)
  })
})
