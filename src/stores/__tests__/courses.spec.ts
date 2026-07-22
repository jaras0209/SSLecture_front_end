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
      const ids = store.courses.map(c => c.id)
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
        student2: 'teacher_bob',
      })

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.studentTeacherDb['student1']).toEqual({ teacher: 'teacher_alice' })
      expect(store.studentTeacherDb['student2']).toEqual({ teacher: 'teacher_bob' })
    })

    it('keeps new-format object values unchanged', async () => {
      // Seed NEW format
      seedLocalStorage('superstart_student_teacher_db', {
        student1: { teacher: 'teacher_alice', pastor: 'pastor_bob' },
      })

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.studentTeacherDb['student1']).toEqual({
        teacher: 'teacher_alice',
        pastor: 'pastor_bob',
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
        '愛與話語': ['品格力 - 正直'],
        '主大明': ['誠實'],
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
        { id: 'custom1', name: '自訂講師', title: '傳道', courseIds: [], church: '愛與話語' },
      ])

      const { useCoursesStore } = await import('@/stores/courses')
      const store = useCoursesStore()

      expect(store.lecturers[0].name).toBe('自訂講師')
    })

    it('migrates lecturers missing church field', async () => {
      seedLocalStorage('superstart_lecturers_db', [
        { id: 'l_old', name: '舊講師', title: '牧師', courseIds: [] },  // no church
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
            sessions: [],
          },
        },
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
})
