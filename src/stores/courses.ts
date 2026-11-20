import { defineStore } from 'pinia'
import { ref } from 'vue'
import { membersOf } from '@/utils/scope'
import { useAuthStore } from '@/stores/auth'
import { safeGet, safeSet } from '@/utils/storage'
import { persistToStorage } from '@/utils/persist'
import { toLocalDateTimeInput, nowIso, normalizeLegacyDateTime } from '@/utils/datetime'
import { createId } from '@/utils/id'
import { buildMockCourses } from '@/mocks/courses'
import { createCourseThemes } from '@/stores/parts/courseThemes'
import { createCourseLecturers } from '@/stores/parts/courseLecturers'
import { createCourseFeedback } from '@/stores/parts/courseFeedback'
import { createShiningProject, withShiningDefaults } from '@/stores/parts/shiningProject'
import { createTeachingStats } from '@/stores/parts/teachingStats'

// 型別定義集中至 src/types/courses.ts—從這裡 re-export 保持向下相容
export type {
  Course,
  ListenSession,
  ProgressRecord,
  UserProgressDb,
  PageRestrictionsDb,
  StudentCaretakers,
  StudentTeacherDb,
  ShiningProject,
  ShiningProjectDb,
  Lecturer,
  TeachingStats,
  TeachingStatsDb,
  ShiningChecklistKey,
  CourseFeedback,
  CourseFeedbackDb
} from '@/types/courses'

// 引入型別供 store 內部使用
import type {
  Course,
  ListenSession,
  ProgressRecord,
  UserProgressDb,
  PageRestrictionsDb,
  StudentCaretakers,
  CaretakerRole,
  AssignedCaretakerRole,
  StudentTeacherDb,
  ShiningProjectDb,
  Lecturer,
  TeachingStatsDb,
  CourseFeedbackDb
} from '@/types/courses'
import { DEFAULT_CHURCH } from '@/types/auth'
import { normalizeLecturerTitle } from '@/utils/lecturerTitle'
import { translate as t } from '@/i18n'
import { listenSessionProblem } from '@/utils/recordRules'
import { refused, SAVED, type SaveResult } from '@/stores/parts/results'

export type { SaveResult } from '@/stores/parts/results'

export const useCoursesStore = defineStore('courses', () => {
  // Course catalog — dev seed data lives in src/mocks/courses.ts
  // TODO（後端就緒後）：replace with GET /courses
  const courses = ref<Course[]>(buildMockCourses())

  // Progress database (persistent)
  const progressDb = ref<UserProgressDb>(
    safeGet<UserProgressDb>('superstart_progress_db', {}, { clearOnError: true })
  )

  // Page restrictions database (persistent)
  const restrictionsDb = ref<PageRestrictionsDb>(
    safeGet<PageRestrictionsDb>('superstart_restrictions_db', {}, { clearOnError: true })
  )

  // Student-Teacher care assignments mapping database (persistent)
  const studentTeacherDb = ref<StudentTeacherDb>({})
  const _rawStudentTeacher = safeGet<Record<string, unknown>>(
    'superstart_student_teacher_db',
    {},
    { clearOnError: true }
  )
  if (Object.keys(_rawStudentTeacher).length > 0) {
    try {
      const migrated: StudentTeacherDb = {}
      Object.keys(_rawStudentTeacher).forEach((studentKey) => {
        const val = _rawStudentTeacher[studentKey]
        if (typeof val === 'string') {
          migrated[studentKey] = { teacher: val }
        } else if (val && typeof val === 'object') {
          migrated[studentKey] = val as StudentCaretakers
        }
      })
      studentTeacherDb.value = migrated
    } catch (e) {
      console.error('Failed to migrate studentTeacherDb:', e)
      studentTeacherDb.value = {}
    }
  }

  // Parent bindings live only on the parent accounts (childUsernames). Older data also
  // kept a parent here: move it to the account and drop it, saving right away so a stale
  // entry can't re-bind a parent that has since been unbound.
  if (Object.values(studentTeacherDb.value).some((c) => c.parent)) {
    const authStore = useAuthStore()
    for (const [student, caretakers] of Object.entries(studentTeacherDb.value)) {
      if (!caretakers.parent) continue
      authStore.bindChild(caretakers.parent, student)
      delete caretakers.parent
      if (Object.keys(caretakers).length === 0) delete studentTeacherDb.value[student]
    }
    safeSet('superstart_student_teacher_db', studentTeacherDb.value)
  }

  // Shining Project database (persistent)
  const shiningProjectDb = ref<ShiningProjectDb>(
    safeGet<ShiningProjectDb>('superstart_shining_project_db', {}, { clearOnError: true })
  )

  // Dynamic themes (persistent)
  const characterThemesDb = ref<Record<string, string[]>>({
    [DEFAULT_CHURCH]: ['品格力 - 自律', '品格力 - 感謝', '品格力 - 勇氣', '品格力 - 正直']
  })
  const _rawCharThemes = safeGet<unknown>('superstart_character_themes_db', null)
  if (_rawCharThemes !== null) {
    try {
      if (Array.isArray(_rawCharThemes)) {
        // Migrate old array format
        characterThemesDb.value[DEFAULT_CHURCH] = _rawCharThemes as string[]
      } else {
        characterThemesDb.value = _rawCharThemes as Record<string, string[]>
      }
    } catch {
      /* ignore */
    }
  }

  const comingOfAgeThemesDb = ref<Record<string, string[]>>({
    [DEFAULT_CHURCH]: ['基督教歷史', '台灣攝理歷史', '情感教育', 'R的使命與精神']
  })
  const _rawAgeThemes = safeGet<unknown>('superstart_coming_of_age_themes_db', null)
  if (_rawAgeThemes !== null) {
    try {
      if (Array.isArray(_rawAgeThemes)) {
        // Migrate old array format
        comingOfAgeThemesDb.value[DEFAULT_CHURCH] = _rawAgeThemes as string[]
      } else {
        comingOfAgeThemesDb.value = _rawAgeThemes as Record<string, string[]>
      }
    } catch {
      /* ignore */
    }
  }

  // Lecturers list (persistent) — migrate existing entries to have church
  const lecturers = ref<Lecturer[]>(
    safeGet<Lecturer[]>('superstart_lecturers_db', [], { clearOnError: true })
  )
  if (lecturers.value.length > 0) {
    // Migrate existing to have church
    lecturers.value.forEach((l) => {
      if (!l.church) l.church = DEFAULT_CHURCH
      // titles used to be stored as Chinese text
      l.title = normalizeLecturerTitle(l.title)
    })
  } else {
    // Default initial mock database
    lecturers.value = [
      {
        id: 'l1',
        name: '張牧師',
        title: 'pastor',
        courseIds: [
          'bible-01',
          'bible-02',
          'bible-03',
          'bible-04',
          'bible-05',
          'bible-06',
          'bible-07',
          'bible-08',
          'bible-09',
          'bible-10'
        ],
        church: DEFAULT_CHURCH
      },
      {
        id: 'l2',
        name: '陳傳道',
        title: 'preacher',
        courseIds: [
          'bible-11',
          'bible-12',
          'bible-13',
          'bible-14',
          'bible-15',
          'lecture-01',
          'lecture-02',
          'lecture-03',
          'lecture-04',
          'lecture-05'
        ],
        church: DEFAULT_CHURCH
      },
      {
        id: 'l3',
        name: '林輔導',
        title: 'counselor',
        courseIds: [
          'lecture-06',
          'lecture-07',
          'lecture-08',
          'lecture-09',
          'lecture-10',
          'lecture-11',
          'lecture-12',
          'lecture-13',
          'lecture-14',
          'lecture-15'
        ],
        church: DEFAULT_CHURCH
      }
    ]
  }

  // Teaching Stats database (persistent)
  const teachingStatsDb = ref<TeachingStatsDb>(
    safeGet<TeachingStatsDb>('superstart_teaching_stats_db', {}, { clearOnError: true })
  )

  // Caretakers' replies to a student's notes on a course (kept as history)
  const feedbackDb = ref<CourseFeedbackDb>(
    safeGet<CourseFeedbackDb>('superstart_feedback_db', {}, { clearOnError: true })
  )

  // When each student last looked at the replies on each course (ISO time), for "new reply" marks
  const feedbackSeenDb = ref<Record<string, Record<string, string>>>(
    safeGet<Record<string, Record<string, string>>>(
      'superstart_feedback_seen_db',
      {},
      { clearOnError: true }
    )
  )

  // ── One-time data migration on load ─────────────────────────────────────────
  // 讀取函式（getStudentProgress / getShiningProject）不再修改資料，
  // 舊格式資料在 store 建立時一次轉換完成，並寫回 localStorage。
  migrateLoadedData()

  function migrateLoadedData(): void {
    const before = {
      progress: JSON.stringify(progressDb.value),
      shining: JSON.stringify(shiningProjectDb.value),
      stats: JSON.stringify(teachingStatsDb.value)
    }

    for (const userRecords of Object.values(progressDb.value)) {
      for (const record of Object.values(userRecords)) {
        if (record.lastUpdated) record.lastUpdated = normalizeLegacyDateTime(record.lastUpdated)
        migrateRecord(record)
        for (const session of record.sessions) {
          if (session.createdAt) session.createdAt = normalizeLegacyDateTime(session.createdAt)
        }
      }
    }

    for (const [username, project] of Object.entries(shiningProjectDb.value)) {
      shiningProjectDb.value[username] = withShiningDefaults(project)
    }

    for (const stats of Object.values(teachingStatsDb.value)) {
      if (stats.submittedAt) stats.submittedAt = normalizeLegacyDateTime(stats.submittedAt)
    }

    if (JSON.stringify(progressDb.value) !== before.progress) {
      safeSet('superstart_progress_db', progressDb.value)
    }
    if (JSON.stringify(shiningProjectDb.value) !== before.shining) {
      safeSet('superstart_shining_project_db', shiningProjectDb.value)
    }
    if (JSON.stringify(teachingStatsDb.value) !== before.stats) {
      safeSet('superstart_teaching_stats_db', teachingStatsDb.value)
    }
  }

  // Watchers to persist state
  persistToStorage(progressDb, 'superstart_progress_db')

  persistToStorage(restrictionsDb, 'superstart_restrictions_db')

  persistToStorage(studentTeacherDb, 'superstart_student_teacher_db')

  persistToStorage(shiningProjectDb, 'superstart_shining_project_db')

  persistToStorage(characterThemesDb, 'superstart_character_themes_db')

  persistToStorage(comingOfAgeThemesDb, 'superstart_coming_of_age_themes_db')

  persistToStorage(lecturers, 'superstart_lecturers_db')

  persistToStorage(teachingStatsDb, 'superstart_teaching_stats_db')

  persistToStorage(feedbackDb, 'superstart_feedback_db')

  persistToStorage(feedbackSeenDb, 'superstart_feedback_seen_db')

  // Groups of functions kept in their own files (src/stores/parts/); they share the state above
  const themesPart = createCourseThemes({
    characterThemesDb,
    comingOfAgeThemesDb,
    shiningProjectDb
  })
  const lecturersPart = createCourseLecturers({ lecturers })
  const feedbackPart = createCourseFeedback({ feedbackDb, feedbackSeenDb })
  const shiningPart = createShiningProject({ shiningProjectDb, progressDb, courses })
  const teachingStatsPart = createTeachingStats({ teachingStatsDb })

  // Actions

  /**
   * Migrate a legacy ProgressRecord (no sessions array) to the new format.
   * Runs once on load (migrateLoadedData); expects lastUpdated already normalized to ISO.
   */
  function migrateRecord(record: ProgressRecord): ProgressRecord {
    if (!record.sessions) {
      record.sessions = []
      // If old record had lecturer/listenedAt info, promote it as the first session
      if (record.completed || record.lecturer || record.listenedAt) {
        const lastUpdated = record.lastUpdated ? new Date(record.lastUpdated) : null
        const fallbackListenedAt =
          lastUpdated && !Number.isNaN(lastUpdated.getTime())
            ? toLocalDateTimeInput(lastUpdated)
            : ''
        record.sessions.push({
          id: 'migrated_' + record.courseId,
          lecturer: record.lecturer || '',
          listenedAt: record.listenedAt || fallbackListenedAt,
          notes: record.notes || '',
          createdAt: record.lastUpdated || nowIso()
        })
      }
    }
    return record
  }

  /**
   * Add a new listening session to a course record, creating the record if needed.
   * Refused (nothing saved) without a lecturer or time, or with a time in the future:
   * a lecture counts towards progress only once it has been heard (utils/recordRules.ts).
   */
  function addListenSession(
    username: string,
    courseId: string,
    session: Omit<ListenSession, 'id' | 'createdAt'>
  ): SaveResult {
    const problem = listenSessionProblem(session)
    if (problem) return refused(problem)
    session = { ...session, lecturer: session.lecturer.trim() }
    if (!progressDb.value[username]) {
      progressDb.value[username] = {}
    }

    const existing = progressDb.value[username][courseId]
    const now = nowIso()
    const newSession: ListenSession = {
      id: createId('session'),
      lecturer: session.lecturer,
      listenedAt: session.listenedAt,
      notes: session.notes,
      createdAt: now
    }

    if (existing) {
      const migrated = migrateRecord(existing)
      migrated.sessions.push(newSession)
      migrated.completed = true
      migrated.notes = session.notes || migrated.notes
      migrated.lastUpdated = now
      progressDb.value[username][courseId] = migrated
    } else {
      progressDb.value[username][courseId] = {
        courseId,
        completed: true,
        notes: session.notes,
        lastUpdated: now,
        sessions: [newSession]
      }
    }
    return SAVED
  }

  /**
   * Update an existing session's editable fields (listenedAt and notes).
   * The lecturer field is intentionally immutable after creation to preserve audit integrity.
   */
  function updateListenSession(
    username: string,
    courseId: string,
    sessionId: string,
    patch: { listenedAt?: string; notes?: string; lecturer?: string }
  ): SaveResult {
    const record = progressDb.value[username]?.[courseId]
    const session = record?.sessions.find((s) => s.id === sessionId)
    if (!record || !session) return { success: false, message: t('stores.courses.sessionNotFound') }
    // The session as it would be after the change must follow the same rules as a new one
    const next = {
      lecturer: (patch.lecturer ?? session.lecturer).trim(),
      listenedAt: patch.listenedAt ?? session.listenedAt,
      notes: patch.notes ?? session.notes
    }
    const problem = listenSessionProblem(next)
    if (problem) return refused(problem)
    Object.assign(session, next)
    record.lastUpdated = nowIso()
    // Trigger reactivity
    progressDb.value = { ...progressDb.value }
    return SAVED
  }

  function getStudentProgress(username: string, courseId: string): ProgressRecord {
    const record = progressDb.value[username]?.[courseId]
    if (record) return record
    return {
      courseId,
      completed: false,
      notes: '',
      lastUpdated: '',
      sessions: []
    }
  }

  // Toggle page restriction (pages like: '/student', '/teacher')
  function toggleRestriction(username: string, page: string): void {
    if (!restrictionsDb.value[username]) {
      restrictionsDb.value[username] = []
    }

    const index = restrictionsDb.value[username].indexOf(page)
    if (index > -1) {
      restrictionsDb.value[username].splice(index, 1)
    } else {
      restrictionsDb.value[username].push(page)
    }
  }

  function isPageRestricted(username: string, page: string): boolean {
    const userRestrictions = restrictionsDb.value[username]
    if (!userRestrictions) return false
    return userRestrictions.includes(page)
  }

  // Student-Teacher care actions
  function assignStudentCaretaker(
    studentUsername: string,
    role: AssignedCaretakerRole,
    username: string
  ): void {
    if (
      !studentTeacherDb.value[studentUsername] ||
      typeof studentTeacherDb.value[studentUsername] !== 'object'
    ) {
      studentTeacherDb.value[studentUsername] = {}
    }
    studentTeacherDb.value[studentUsername][role] = username
    studentTeacherDb.value = { ...studentTeacherDb.value }
  }

  function removeStudentCaretaker(studentUsername: string, role: AssignedCaretakerRole): void {
    if (
      studentTeacherDb.value[studentUsername] &&
      typeof studentTeacherDb.value[studentUsername] === 'object'
    ) {
      delete studentTeacherDb.value[studentUsername][role]
      if (Object.keys(studentTeacherDb.value[studentUsername]).length === 0) {
        delete studentTeacherDb.value[studentUsername]
      }
      studentTeacherDb.value = { ...studentTeacherDb.value }
    }
  }

  function getStudentCaretaker(studentUsername: string, role: AssignedCaretakerRole): string {
    const caretakers = studentTeacherDb.value[studentUsername]
    if (caretakers && typeof caretakers === 'object') {
      return caretakers[role] || ''
    }
    return ''
  }

  /** Remove `username` wherever they are a student's mentor teacher or pastor; returns how many */
  function releaseCaretaker(username: string, role: AssignedCaretakerRole): number {
    let count = 0
    for (const student of Object.keys(studentTeacherDb.value)) {
      if (studentTeacherDb.value[student]?.[role] === username) {
        removeStudentCaretaker(student, role)
        count++
      }
    }
    return count
  }

  /** Drop a student's mentor/pastor assignments (e.g. when the student account goes away) */
  function releaseStudent(studentUsername: string): void {
    if (!studentTeacherDb.value[studentUsername]) return
    delete studentTeacherDb.value[studentUsername]
    studentTeacherDb.value = { ...studentTeacherDb.value }
  }

  /** Unlink lecturers from a teacher account (they stay as lecturers by name); returns how many */
  function unlinkLecturerAccount(username: string): number {
    const linked = lecturers.value.filter((l) => l.linkedUsername === username)
    linked.forEach((l) => (l.linkedUsername = undefined))
    return linked.length
  }

  /** Whether `username` cares for the student as `role` (parents: a binding on their account) */
  function isStudentCaredBy(
    studentUsername: string,
    role: CaretakerRole,
    username: string
  ): boolean {
    if (role === 'parent') return useAuthStore().parentsOf(studentUsername).includes(username)
    return getStudentCaretaker(studentUsername, role) === username
  }

  /**
   * 取得一筆紀錄中每次聽課的講師名稱（已 trim、排除空白）。
   * 講師記錄在 sessions[].lecturer；尚未遷移的舊紀錄則退回 record.lecturer。
   * 不修改 record，可安全用於統計。
   */
  function getSessionLecturers(record: ProgressRecord): string[] {
    const names = record.sessions ? record.sessions.map((s) => s.lecturer) : [record.lecturer]
    return names.map((n) => (n ?? '').trim()).filter((n) => n !== '')
  }

  /**
   * 取得某帳號實際被學員登記為講師的課程授課次數統計
   * 回傳該講師在指定教會學員紀錄中的聽課次數總和
   */
  function getActualTeachingCourseCounts(
    authUsersDb: Record<string, { role: string; church?: string }>,
    lecturerName: string,
    church: string
  ): number {
    const target = lecturerName.trim()
    let count = 0
    getStudentsByChurch(authUsersDb, church).forEach((studentUsername) => {
      Object.values(progressDb.value[studentUsername] ?? {}).forEach((record) => {
        count += getSessionLecturers(record).filter((name) => name === target).length
      })
    })
    return count
  }

  // Church-based query functions
  function getStudentsByChurch(
    authUsersDb: Record<string, { role: string; church?: string }>,
    church: string
  ): string[] {
    return membersOf(authUsersDb, 'student', church)
  }

  function getTeachersByChurch(
    authUsersDb: Record<string, { role: string; church?: string }>,
    church: string
  ): string[] {
    return membersOf(authUsersDb, 'teacher', church)
  }

  function getPastorsByChurch(
    authUsersDb: Record<string, { role: string; church?: string }>,
    church: string
  ): string[] {
    return membersOf(authUsersDb, 'pastor', church)
  }

  function getParentsByChurch(
    authUsersDb: Record<string, { role: string; church?: string }>,
    church: string
  ): string[] {
    return membersOf(authUsersDb, 'parent', church)
  }

  function getStudentsManagedByTeacher(teacherUsername: string): string[] {
    const managed: string[] = []
    Object.keys(studentTeacherDb.value).forEach((studentUsername) => {
      const caretakers = studentTeacherDb.value[studentUsername]
      if (caretakers && typeof caretakers === 'object' && caretakers.teacher === teacherUsername) {
        managed.push(studentUsername)
      }
    })
    return managed
  }

  function getChurchSummaries(
    authUsersDb: Record<string, { role: string; church?: string }>
  ): { church: string; teacherCount: number; studentCount: number }[] {
    const churchMap: Record<string, { teacherCount: number; studentCount: number }> = {}
    Object.keys(authUsersDb).forEach((username) => {
      const user = authUsersDb[username]
      if (!user.church) return
      if (!churchMap[user.church]) {
        churchMap[user.church] = { teacherCount: 0, studentCount: 0 }
      }
      if (user.role === 'teacher') churchMap[user.church].teacherCount++
      if (user.role === 'student') churchMap[user.church].studentCount++
    })
    return Object.entries(churchMap).map(([church, stats]) => ({ church, ...stats }))
  }

  function getLecturerStatsForChurch(
    authUsersDb: Record<string, { role: string; church?: string }>,
    church: string
  ): { lecturerName: string; sessionCount: number }[] {
    // Get students in this church
    const churchStudents = getStudentsByChurch(authUsersDb, church)
    const lecturerCounts: Record<string, number> = {}

    churchStudents.forEach((studentUsername) => {
      Object.values(progressDb.value[studentUsername] ?? {}).forEach((record) => {
        getSessionLecturers(record).forEach((name) => {
          lecturerCounts[name] = (lecturerCounts[name] || 0) + 1
        })
      })
    })

    return Object.entries(lecturerCounts)
      .map(([lecturerName, sessionCount]) => ({ lecturerName, sessionCount }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
  }

  return {
    ...themesPart,
    ...lecturersPart,
    ...feedbackPart,
    ...shiningPart,
    ...teachingStatsPart,
    courses,
    progressDb,
    restrictionsDb,
    studentTeacherDb,
    shiningProjectDb,
    characterThemesDb,
    comingOfAgeThemesDb,
    lecturers,
    teachingStatsDb,
    addListenSession,
    updateListenSession,
    getStudentProgress,
    toggleRestriction,
    isPageRestricted,
    assignStudentCaretaker,
    removeStudentCaretaker,
    getStudentCaretaker,
    isStudentCaredBy,
    releaseCaretaker,
    releaseStudent,
    unlinkLecturerAccount,
    getStudentsByChurch,
    getTeachersByChurch,
    getPastorsByChurch,
    getParentsByChurch,
    getStudentsManagedByTeacher,
    getChurchSummaries,
    getLecturerStatsForChurch,
    feedbackDb,
    getActualTeachingCourseCounts
  }
})
