/**
 * @file src/__tests__/sampleBackup.spec.ts
 * @description The sample backup that scripts/backup-to-sql.py is tested with
 * (scripts/fixtures/sample-backup.json) must be what the front end actually saves.
 *
 * The backup is made here with the real stores, the way people use them, and compared with
 * the file. When the stores save something new or differently, this test fails: run
 * `npm run fixtures:backup` to write the new sample, then check that scripts/backup-to-sql.py
 * (and docs/database_schema.md section 9) handle the change; CI imports the sample into MySQL.
 *
 * Random IDs come from a seeded generator and the clock is fixed, so the same code always
 * makes the same file. The dates are chosen so the stores' rules pass in any time zone.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import { BACKUP_KEYS, createBackup } from '@/utils/backup'
import { flushPersistence } from '@/utils/persist'

const SAMPLE = '../../scripts/fixtures/sample-backup.json'
const HINT =
  'The front end saves its data differently now: run `npm run fixtures:backup`, then update ' +
  'scripts/backup-to-sql.py and docs/database_schema.md section 9 if needed'

/** Repeatable "random" bytes (mulberry32) for createId() and the invite codes */
function seededRandom(seed: number) {
  let state = seed
  return <T extends ArrayBufferView | null>(array: T): T => {
    const bytes = new Uint8Array(array!.buffer, array!.byteOffset, array!.byteLength)
    for (let i = 0; i < bytes.length; i++) {
      state = (state + 0x6d2b79f5) | 0
      let t = Math.imul(state ^ (state >>> 15), 1 | state)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      bytes[i] = ((t ^ (t >>> 14)) >>> 0) & 0xff
    }
    return array
  }
}

function expectSaved(result: { success: boolean; message?: string } | undefined, what: string) {
  expect(result?.success, `${what}: ${result?.message}`).toBe(true)
}

/** Everything a church does in the app, through the stores, then the backup an admin exports */
function makeSampleBackup() {
  localStorage.clear()
  vi.spyOn(crypto, 'getRandomValues').mockImplementation(seededRandom(20261125))
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-01T02:00:00Z'))
  setActivePinia(createPinia())
  const auth = useAuthStore()
  const courses = useCoursesStore()
  const bookings = useBookingsStore()

  // Accounts: new ones, a social sign-in, a deleted one; gender and a parent binding
  const accounts = [
    { username: 'mei', password: 'Temp-pass-1', role: 'student', email: 'Mei@Example.TW' },
    { username: 'lin.teacher', password: 'Temp-pass-2', role: 'teacher' },
    { username: 'mom_chen', password: 'Temp-pass-3', role: 'parent' },
    { username: 'wang-pastor', password: 'Temp-pass-4', role: 'pastor', church: '主大明' },
    { username: 'leaving', password: 'Temp-pass-5', role: 'student', church: '主大明' }
  ] as const
  for (const account of accounts) {
    expectSaved(auth.createAccount({ church: '愛與話語', ...account }), account.username)
  }
  Object.assign(auth.usersDb['mei']!, {
    displayName: '小美',
    realName: '陳小美',
    avatarUrl: 'https://example.tw/mei.png'
  })
  // Saved before only https:// avatars were accepted
  auth.usersDb['lin.teacher']!.avatarUrl = 'http://old.example.tw/lin.png'
  auth.usersDb['lin.teacher']!.mustChangePassword = false
  auth.usersDb['student']!.lastLoginAt = '2026-08-30T12:00:00.000Z'
  // What the mock's social sign-in saves (no password)
  auth.usersDb['oauth_google_1'] = {
    passwordHash: '',
    role: 'student',
    loginMethod: 'google',
    church: '愛與話語',
    email: 'g.user@gmail.com',
    displayName: 'G User'
  }
  auth.setGender('mei', 'female')
  auth.setGender('lin.teacher', 'female')
  auth.setGender('oauth_google_1', 'male')
  auth.bindChild('mom_chen', 'mei')
  auth.deleteAccount('leaving')

  // Caretakers and a page restriction
  courses.assignStudentCaretaker('mei', 'teacher', 'lin.teacher')
  courses.assignStudentCaretaker('mei', 'pastor', 'pastor')
  courses.assignStudentCaretaker('student', 'teacher', 'teacher')
  courses.toggleRestriction('mei', '/shining')

  // Invite codes: open, used, revoked
  auth.generateInviteCode('student', '愛與話語', 'admin')
  const used = auth.generateInviteCode('teacher', '愛與話語', 'admin')
  auth.consumeInviteCode(used, 'lin.teacher')
  auth.revokeInviteCode(auth.generateInviteCode('pastor', '主大明', 'admin'))

  // Lecturers, one linked to an account
  expectSaved(
    courses.addLecturer(
      '林老師',
      'lecturer',
      ['bible-01', 'lecture-02'],
      '愛與話語',
      'lin.teacher'
    ),
    'lecturer'
  )
  expectSaved(courses.addLecturer('Grace Wu', 'guest', ['lecture-03'], '主大明'), 'lecturer 2')

  // Listen records (in the past in every time zone) and feedback
  const listen = (student: string, course: string, lecturer: string, at: string, notes: string) =>
    expectSaved(
      courses.addListenSession(student, course, { lecturer, listenedAt: at, notes }),
      `listen ${at}`
    )
  listen('student', 'bible-01', '張牧師', '2026-08-28T19:30', '第一次聽，很受感動')
  listen('student', 'bible-01', '張牧師', '2026-08-29T09:00', '')
  listen('mei', 'lecture-02', '林老師', '2026-08-15T20:00', '想再聽一次')
  expect(courses.addFeedback('student', 'bible-01', 'teacher', '很好，下次分享給小組')).toBeTruthy()
  expect(
    courses.addFeedback('mei', 'lecture-02', 'pastor', `說得好！可以再想想 "為什麼" 和 '怎麼做'`)
  ).toBeTruthy()
  courses.markFeedbackSeen('student', 'bible-01')

  // Shining project; a theme added and one renamed
  const info = { name: '王小明', birthday: '2012-05-01', church: '愛與話語', schoolGrade: '國一' }
  expectSaved(courses.updateShiningBasicInfo('student', info), 'shining')
  courses.updateShiningChecklist('student', 'faithPhase1', 'worship', true)
  courses.updateShiningChecklist('student', 'advancedChallenges', 'custom', true)
  courses.updateShiningCustomChallenge('student', '每天背一節經文')
  expectSaved(
    courses.updateShiningLecture('student', 'character', '品格力 - 自律', '張牧師', '2026-08-20'),
    'shining lecture'
  )
  expectSaved(
    courses.updateShiningLecture('student', 'comingOfAge', '基督教歷史', '陳傳道', ''),
    'shining topic'
  )
  expectSaved(courses.addTheme('character', '品格力 - 誠實', '愛與話語'), 'theme')
  expectSaved(
    courses.updateTheme('character', '品格力 - 勇氣', '品格力 - 勇敢', '愛與話語'),
    'theme rename'
  )

  courses.saveTeachingStats('teacher', 2026, '愛與話語', {
    oneOnOne30: 3,
    oneToMany30: 1,
    oneOnOneShining: 0,
    oneToManyShining: 2
  })

  // Bookings: one completed, one pending group booking, one cancelled
  const lecturer = courses.lecturers.find((l) => l.id === 'l1')!
  const booking = {
    courseId: 'bible-02',
    courseTitle: '日月停止',
    lecturerId: lecturer.id,
    lecturerName: lecturer.name,
    lecturerTitle: lecturer.title,
    teacherUsername: 'teacher',
    durationMinutes: 90,
    prep: { scriptures: ['約書亞記 10:12-14'], readingNotes: '先讀經文', materials: '' },
    church: '愛與話語',
    studentUsernames: ['student']
  }
  const done = bookings.proposeSession({ ...booking, proposedAt: '2026-09-10T14:00' })
  expectSaved(done, 'booking')
  expectSaved(bookings.confirmSession(done.session!.id, '2026-09-10T14:00'), 'confirm')
  expectSaved(
    bookings.proposeSession({
      ...booking,
      courseId: 'lecture-02',
      courseTitle: '聖子論',
      teacherUsername: 'lin.teacher',
      proposedAt: '2026-12-20T19:30',
      studentUsernames: ['mei', 'oauth_google_1'],
      prep: { scriptures: [], readingNotes: '', materials: '筆記本' }
    }),
    'group booking'
  )
  const cancelled = bookings.proposeSession({ ...booking, proposedAt: '2026-09-20T10:00' })
  expectSaved(cancelled, 'booking to cancel')
  bookings.updateSessionStatus(cancelled.session!.id, 'cancelled', { cancelReason: '講師臨時有事' })

  // After the lecture started in every time zone
  vi.setSystemTime(new Date('2026-09-11T12:00:00Z'))
  expectSaved(
    bookings.finishSession(done.session!.id, '大家都很投入', {
      student: {
        attendanceStatus: 'attended',
        studentFeedback: '收穫很多',
        teacherFeedback: '專心聽講'
      }
    }),
    'finish'
  )

  vi.setSystemTime(new Date('2026-09-12T01:00:00Z'))
  flushPersistence()
  return createBackup(new Date())
}

describe('sample backup for scripts/backup-to-sql.py', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('is what the front end saves', async () => {
    const text = JSON.stringify(makeSampleBackup(), null, 2) + '\n'
    await expect(text, HINT).toMatchFileSnapshot(SAMPLE)
  })

  it('holds every kind of data a backup can have', () => {
    const data = makeSampleBackup().data
    expect(Object.keys(data).sort()).toEqual([...BACKUP_KEYS].sort())
    for (const [key, value] of Object.entries(data)) {
      expect(Object.keys(value as object).length, key).toBeGreaterThan(0)
    }
  })
})
