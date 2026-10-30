import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ── Helpers ──────────────────────────────────────────────────────────────────

function seedLocalStorage(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCoursesStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── courses list ──────────────────────────────────────────────────────────

  describe('courses list', () => {
    it('initializes 30 courses', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      expect(store.courses).toHaveLength(30)
    })

    it('assigns unique ids to all courses', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      const ids = store.courses.map((c) => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  // ── studentTeacherDb migration ────────────────────────────────────────────

  describe('studentTeacherDb — old-format migration', () => {
    it('migrates string value to { teacher: string } format', async () => {
      // Seed OLD format: { "student1": "teacher1" }
      seedLocalStorage('superstart_student_teacher_db', {
        student1: 'teacher_alice',
        student2: 'teacher_bob'
      })

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.studentTeacherDb['student1']).toEqual({ teacher: 'teacher_alice' })
      expect(store.studentTeacherDb['student2']).toEqual({ teacher: 'teacher_bob' })
    })

    it('keeps new-format object values unchanged', async () => {
      // Seed NEW format
      seedLocalStorage('superstart_student_teacher_db', {
        student1: { teacher: 'teacher_alice', pastor: 'pastor_bob' }
      })

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.studentTeacherDb['student1']).toEqual({
        teacher: 'teacher_alice',
        pastor: 'pastor_bob'
      })
    })

    it('handles corrupted JSON gracefully (returns empty object)', async () => {
      localStorage.setItem('superstart_student_teacher_db', 'not-json{{')

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.studentTeacherDb).toEqual({})
    })
  })

  // ── characterThemesDb migration ───────────────────────────────────────────

  describe('characterThemesDb — old-array migration', () => {
    it('migrates old array format to { 愛與話語: [...] }', async () => {
      // OLD format was just an array, not an object
      seedLocalStorage('superstart_character_themes_db', ['品格力 - 自律', '品格力 - 勇氣'])

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.characterThemesDb['愛與話語']).toEqual(['品格力 - 自律', '品格力 - 勇氣'])
    })

    it('keeps new-format object unchanged', async () => {
      seedLocalStorage('superstart_character_themes_db', {
        愛與話語: ['品格力 - 正直'],
        主大明: ['誠實']
      })

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.characterThemesDb['主大明']).toEqual(['誠實'])
    })
  })

  // ── comingOfAgeThemesDb migration ─────────────────────────────────────────

  describe('comingOfAgeThemesDb — old-array migration', () => {
    it('migrates old array format', async () => {
      seedLocalStorage('superstart_coming_of_age_themes_db', ['台灣攝理歷史', '情感教育'])

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.comingOfAgeThemesDb['愛與話語']).toEqual(['台灣攝理歷史', '情感教育'])
    })
  })

  // ── lecturers defaults ─────────────────────────────────────────────────────

  describe('lecturers', () => {
    it('loads default lecturers when localStorage is empty', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      expect(store.lecturers.length).toBeGreaterThanOrEqual(3)
    })

    it('restores persisted lecturers from localStorage', async () => {
      seedLocalStorage('superstart_lecturers_db', [
        { id: 'custom1', name: '自訂講師', title: '傳道', courseIds: [], church: '愛與話語' }
      ])

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.lecturers[0].name).toBe('自訂講師')
    })

    it('migrates lecturers missing church field', async () => {
      seedLocalStorage('superstart_lecturers_db', [
        { id: 'l_old', name: '舊講師', title: '牧師', courseIds: [] } // no church
      ])

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.lecturers[0].church).toBe('愛與話語')
    })
  })

  // ── progressDb ────────────────────────────────────────────────────────────

  describe('progressDb', () => {
    it('starts empty when no data in localStorage', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      expect(store.progressDb).toEqual({})
    })

    it('restores persisted progress', async () => {
      seedLocalStorage('superstart_progress_db', {
        student: {
          'bible-01': {
            courseId: 'bible-01',
            completed: true,
            notes: '',
            lastUpdated: '2025-01-01',
            sessions: []
          }
        }
      })

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.progressDb['student']['bible-01'].completed).toBe(true)
    })

    it('returns empty object when localStorage is corrupted', async () => {
      localStorage.setItem('superstart_progress_db', '}{bad json')

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.progressDb).toEqual({})
      expect(console.warn).toHaveBeenCalled()
    })
  })

  // ── lecturer statistics ───────────────────────────────────────────────────

  describe('lecturer statistics', () => {
    const usersDb = {
      student: { role: 'student', church: '愛與話語' },
      other: { role: 'student', church: '其他教會' }
    }

    it('counts lecturers recorded on listen sessions', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      store.addListenSession('student', 'bible-01', {
        lecturer: '張牧師',
        listenedAt: '2026-10-01T10:00',
        notes: ''
      })
      store.addListenSession('student', 'bible-01', {
        lecturer: ' 張牧師 ',
        listenedAt: '2026-10-08T10:00',
        notes: ''
      })
      store.addListenSession('student', 'bible-02', {
        lecturer: '陳傳道',
        listenedAt: '2026-10-15T10:00',
        notes: ''
      })
      store.addListenSession('student', 'bible-03', {
        lecturer: '',
        listenedAt: '2026-10-22T10:00',
        notes: ''
      })
      store.addListenSession('other', 'bible-01', {
        lecturer: '張牧師',
        listenedAt: '2026-10-01T10:00',
        notes: ''
      })

      expect(store.getActualTeachingCourseCounts(usersDb, '張牧師', '愛與話語')).toBe(2)
      expect(store.getLecturerStatsForChurch(usersDb, '愛與話語')).toEqual([
        { lecturerName: '張牧師', sessionCount: 2 },
        { lecturerName: '陳傳道', sessionCount: 1 }
      ])
    })

    it('falls back to the legacy record.lecturer field for unmigrated records', async () => {
      seedLocalStorage('superstart_progress_db', {
        student: {
          'bible-01': {
            courseId: 'bible-01',
            completed: true,
            notes: '',
            lastUpdated: '',
            lecturer: '張牧師'
          }
        }
      })
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.getActualTeachingCourseCounts(usersDb, '張牧師', '愛與話語')).toBe(1)
      expect(store.getLecturerStatsForChurch(usersDb, '愛與話語')).toEqual([
        { lecturerName: '張牧師', sessionCount: 1 }
      ])
    })
  })

  // ── read functions are pure ───────────────────────────────────────────────

  describe('read functions do not write', () => {
    it('getShiningProject() returns a blank template without storing it', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      const proj = store.getShiningProject('student')
      expect(proj.name).toBe('')
      expect(proj.faithPhase2.courses30).toBe(false)
      expect(store.shiningProjectDb).toEqual({})
    })

    it('getShiningProject() returns the same stored object on every call', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      store.updateShiningCustomChallenge('student', '每天讀經')
      expect(store.getShiningProject('student')).toBe(store.getShiningProject('student'))
      expect(store.getShiningProject('student').customChallenge).toBe('每天讀經')
    })

    it('getShiningProject() does not store courses30 even when all courses are done', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      store.updateShiningCustomChallenge('student', 'x')
      store.courses.forEach((c) =>
        store.addListenSession('student', c.id, { lecturer: '', listenedAt: '', notes: '' })
      )
      expect(store.getShiningProject('student').faithPhase2.courses30).toBe(false)
      expect(store.isShiningChecked('student', 'faithPhase2', 'courses30')).toBe(true)
    })

    it('getStudentProgress() returns a blank record without storing it', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      expect(store.getStudentProgress('student', 'bible-01').completed).toBe(false)
      expect(store.progressDb).toEqual({})
    })
  })

  // ── course completion ─────────────────────────────────────────────────────

  describe('course completion', () => {
    it('counts only completed courses that exist in the catalog', async () => {
      seedLocalStorage('superstart_progress_db', {
        student: {
          'bible-01': {
            courseId: 'bible-01',
            completed: true,
            notes: '',
            lastUpdated: '',
            sessions: []
          },
          'bible-02': {
            courseId: 'bible-02',
            completed: false,
            notes: '',
            lastUpdated: '',
            sessions: []
          },
          'removed-course': {
            courseId: 'removed-course',
            completed: true,
            notes: '',
            lastUpdated: '',
            sessions: []
          }
        }
      })
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      expect(store.getCompletedCourseCount('student')).toBe(1)
      expect(store.hasCompletedAllCourses('student')).toBe(false)
    })

    it('auto-checks courses30 only after every catalog course is completed', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      const [last, ...rest] = store.courses
      rest.forEach((c) =>
        store.addListenSession('student', c.id, { lecturer: '', listenedAt: '', notes: '' })
      )
      expect(store.isShiningChecked('student', 'faithPhase2', 'courses30')).toBe(false)
      store.addListenSession('student', last.id, { lecturer: '', listenedAt: '', notes: '' })
      expect(store.isShiningChecked('student', 'faithPhase2', 'courses30')).toBe(true)
    })

    it('still honours a manually stored courses30 check', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      store.updateShiningChecklist('student', 'faithPhase2', 'courses30', true)
      expect(store.isShiningChecked('student', 'faithPhase2', 'courses30')).toBe(true)
    })
  })

  // ── legacy data migration on load ─────────────────────────────────────────

  describe('legacy data migration on load', () => {
    const originalTz = process.env.TZ

    beforeEach(() => {
      process.env.TZ = 'Asia/Taipei'
    })

    afterEach(() => {
      process.env.TZ = originalTz
    })

    it('adds sessions to old records and converts zh-TW dates to ISO, then persists', async () => {
      seedLocalStorage('superstart_progress_db', {
        student: {
          'bible-01': {
            courseId: 'bible-01',
            completed: true,
            notes: '心得',
            lastUpdated: '2026/9/5 14:30:00',
            lecturer: '張牧師'
          }
        }
      })
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      const record = store.progressDb['student']['bible-01']

      expect(record.lastUpdated).toBe('2026-09-05T06:30:00.000Z')
      expect(record.sessions).toHaveLength(1)
      expect(record.sessions[0]).toMatchObject({
        lecturer: '張牧師',
        listenedAt: '2026-09-05T14:30', // datetime-local format, local time
        notes: '心得',
        createdAt: '2026-09-05T06:30:00.000Z'
      })
      const persisted = JSON.parse(localStorage.getItem('superstart_progress_db') || '{}')
      expect(persisted.student['bible-01'].lastUpdated).toBe('2026-09-05T06:30:00.000Z')
    })

    it('converts session createdAt and teaching stats submittedAt to ISO', async () => {
      seedLocalStorage('superstart_progress_db', {
        student: {
          'bible-01': {
            courseId: 'bible-01',
            completed: true,
            notes: '',
            lastUpdated: '2026/10/28 09:00:00',
            sessions: [
              {
                id: 's1',
                lecturer: '',
                listenedAt: '',
                notes: '',
                createdAt: '2026/10/28 09:00:00'
              }
            ]
          }
        }
      })
      seedLocalStorage('superstart_teaching_stats_db', {
        teacher_2026: {
          teacherUsername: 'teacher',
          year: 2026,
          church: '愛與話語',
          oneOnOne30: 1,
          oneToMany30: 0,
          oneOnOneShining: 0,
          oneToManyShining: 0,
          submittedAt: '2026/10/1 08:00:00'
        }
      })
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      expect(store.progressDb['student']['bible-01'].sessions[0].createdAt).toBe(
        '2026-10-28T01:00:00.000Z'
      )
      expect(store.teachingStatsDb['teacher_2026'].submittedAt).toBe('2026-10-01T00:00:00.000Z')
    })

    it('fills fields missing from old Shining Projects', async () => {
      seedLocalStorage('superstart_shining_project_db', {
        student: { name: '小明', faithPhase1: { worship: true } }
      })
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      const proj = store.getShiningProject('student')
      expect(proj.name).toBe('小明')
      expect(proj.faithPhase1.worship).toBe(true)
      expect(proj.faithPhase1.prayer).toBe(false)
      expect(proj.faithPhase2.courses30).toBe(false)
      expect(proj.characterLectures).toEqual({})
      expect(proj.comingOfAgeTopics).toEqual({})
    })
  })

  // ── ids and timestamps ────────────────────────────────────────────────────

  describe('ids and timestamps', () => {
    it('gives listen sessions unique ids and ISO createdAt within the same millisecond', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-28T06:00:00Z'))
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      store.addListenSession('student', 'bible-01', { lecturer: '', listenedAt: '', notes: 'a' })
      store.addListenSession('student', 'bible-01', { lecturer: '', listenedAt: '', notes: 'b' })
      const record = store.progressDb['student']['bible-01']
      vi.useRealTimers()

      expect(record.sessions[0].id).not.toBe(record.sessions[1].id)
      expect(record.sessions[0].createdAt).toBe('2026-10-28T06:00:00.000Z')
      expect(record.lastUpdated).toBe('2026-10-28T06:00:00.000Z')
    })

    it('gives lecturers added in the same millisecond unique ids', async () => {
      vi.useFakeTimers()
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      store.addLecturer('甲', '牧師', [], '愛與話語')
      store.addLecturer('乙', '牧師', [], '愛與話語')
      vi.useRealTimers()
      const ids = store.lecturers.map((l) => l.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('church membership queries', () => {
    const usersDb = {
      a: { role: 'student', church: '愛與話語' },
      b: { role: 'teacher', church: '愛與話語' },
      c: { role: 'student', church: '主大明' },
      d: { role: 'pastor', church: '愛與話語' },
      e: { role: 'parent', church: '愛與話語' },
      f: { role: 'admin' },
      g: { role: 'student', church: '愛與話語' }
    }

    it('lists members of a church by role, in account order', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()
      expect(store.getStudentsByChurch(usersDb, '愛與話語')).toEqual(['a', 'g'])
      expect(store.getTeachersByChurch(usersDb, '愛與話語')).toEqual(['b'])
      expect(store.getPastorsByChurch(usersDb, '愛與話語')).toEqual(['d'])
      expect(store.getParentsByChurch(usersDb, '愛與話語')).toEqual(['e'])
      expect(store.getStudentsByChurch(usersDb, '主大明')).toEqual(['c'])
      expect(store.getStudentsByChurch(usersDb, '不存在')).toEqual([])
    })

    it('summarises teachers and students per church', async () => {
      const { useCoursesStore } = await import('@/stores/courses')
      expect(useCoursesStore().getChurchSummaries(usersDb)).toEqual([
        { church: '愛與話語', teacherCount: 1, studentCount: 2 },
        { church: '主大明', teacherCount: 0, studentCount: 1 }
      ])
    })
  })
})
