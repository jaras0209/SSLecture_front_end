import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { safeGet, safeSet } from '@/utils/storage'
import { toLocalDateTimeInput, nowIso, normalizeLegacyDateTime } from '@/utils/datetime'
import { createId } from '@/utils/id'
import { buildMockCourses } from '@/mocks/courses'

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
  ShiningChecklistKey
} from '@/types/courses'

// 引入型別供 store 內部使用
import type {
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
  ShiningChecklistKey
} from '@/types/courses'
import { DEFAULT_CHURCH } from '@/types/auth'

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
    })
  } else {
    // Default initial mock database
    lecturers.value = [
      {
        id: 'l1',
        name: '張牧師',
        title: '牧師',
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
        title: '傳道',
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
        title: '輔導',
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
  watch(
    progressDb,
    (newDb) => {
      safeSet('superstart_progress_db', newDb)
    },
    { deep: true }
  )

  watch(
    restrictionsDb,
    (newDb) => {
      safeSet('superstart_restrictions_db', newDb)
    },
    { deep: true }
  )

  watch(
    studentTeacherDb,
    (newDb) => {
      safeSet('superstart_student_teacher_db', newDb)
    },
    { deep: true }
  )

  watch(
    shiningProjectDb,
    (newDb) => {
      safeSet('superstart_shining_project_db', newDb)
    },
    { deep: true }
  )

  watch(
    characterThemesDb,
    (newThemes) => {
      safeSet('superstart_character_themes_db', newThemes)
    },
    { deep: true }
  )

  watch(
    comingOfAgeThemesDb,
    (newThemes) => {
      safeSet('superstart_coming_of_age_themes_db', newThemes)
    },
    { deep: true }
  )

  watch(
    lecturers,
    (newLecturers) => {
      safeSet('superstart_lecturers_db', newLecturers)
    },
    { deep: true }
  )

  watch(
    teachingStatsDb,
    (newStats) => {
      safeSet('superstart_teaching_stats_db', newStats)
    },
    { deep: true }
  )

  // Blank template initializer
  function createBlankShiningProject(): ShiningProject {
    const charLectures: Record<string, { speaker: string; date: string }> = {}
    const ageTopics: Record<string, { speaker: string; date: string }> = {}

    return {
      name: '',
      birthday: '',
      church: '',
      schoolGrade: '',
      faithPhase1: {
        worship: false,
        prayer: false,
        independent: false,
        reply: false,
        share: false
      },
      faithPhase2: {
        courses30: false,
        prayerLong: false,
        morningWorship: false,
        readBible: false,
        churchService: false
      },
      advancedChallenges: {
        wednesday: false,
        shareFaith: false,
        copySermon: false,
        morningProverb: false,
        custom: false
      },
      customChallenge: '',
      characterLectures: charLectures,
      comingOfAgeTopics: ageTopics
    }
  }

  /** Fill in any fields missing from an older stored ShiningProject. */
  function withShiningDefaults(project: Partial<ShiningProject>): ShiningProject {
    const blank = createBlankShiningProject()
    return {
      ...blank,
      ...project,
      faithPhase1: { ...blank.faithPhase1, ...project.faithPhase1 },
      faithPhase2: { ...blank.faithPhase2, ...project.faithPhase2 },
      advancedChallenges: { ...blank.advancedChallenges, ...project.advancedChallenges },
      characterLectures: project.characterLectures ?? {},
      comingOfAgeTopics: project.comingOfAgeTopics ?? {}
    }
  }

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
   * Add a new listening session to a course record.
   * Creates the record if it doesn't exist yet.
   */
  function addListenSession(
    username: string,
    courseId: string,
    session: Omit<ListenSession, 'id' | 'createdAt'>
  ): void {
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
  ): boolean {
    const record = progressDb.value[username]?.[courseId]
    if (!record) return false
    const session = record.sessions.find((s) => s.id === sessionId)
    if (!session) return false
    if (patch.listenedAt !== undefined) session.listenedAt = patch.listenedAt
    if (patch.notes !== undefined) session.notes = patch.notes
    if (patch.lecturer !== undefined) session.lecturer = patch.lecturer
    record.lastUpdated = nowIso()
    // Trigger reactivity
    progressDb.value = { ...progressDb.value }
    return true
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
    role: 'teacher' | 'pastor' | 'parent',
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

  function removeStudentCaretaker(
    studentUsername: string,
    role: 'teacher' | 'pastor' | 'parent'
  ): void {
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

  function getStudentCaretaker(
    studentUsername: string,
    role: 'teacher' | 'pastor' | 'parent'
  ): string {
    const caretakers = studentTeacherDb.value[studentUsername]
    if (caretakers && typeof caretakers === 'object') {
      return caretakers[role] || ''
    }
    return ''
  }

  // Dynamic themes actions
  function getThemesByChurch(type: 'character' | 'comingOfAge', church: string): string[] {
    const db = type === 'character' ? characterThemesDb : comingOfAgeThemesDb
    return db.value[church] || []
  }

  function addTheme(type: 'character' | 'comingOfAge', themeName: string, church: string): void {
    const db = type === 'character' ? characterThemesDb : comingOfAgeThemesDb
    if (!db.value[church]) {
      db.value[church] = []
    }
    if (!db.value[church].includes(themeName)) {
      db.value[church].push(themeName)
    }
  }

  function deleteTheme(type: 'character' | 'comingOfAge', themeName: string, church: string): void {
    const db = type === 'character' ? characterThemesDb : comingOfAgeThemesDb
    if (db.value[church]) {
      const index = db.value[church].indexOf(themeName)
      if (index > -1) {
        db.value[church].splice(index, 1)
      }
    }
  }

  function updateTheme(
    type: 'character' | 'comingOfAge',
    oldName: string,
    newName: string,
    church: string
  ): void {
    const db = type === 'character' ? characterThemesDb : comingOfAgeThemesDb
    if (db.value[church]) {
      const index = db.value[church].indexOf(oldName)
      if (index > -1) {
        db.value[church][index] = newName
      }
    }
  }

  // Lecturer actions
  function getLecturersByChurch(church: string): Lecturer[] {
    return lecturers.value.filter((l) => l.church === church || !l.church)
  }

  function addLecturer(
    name: string,
    title: string,
    courseIds: string[],
    church: string,
    linkedUsername?: string
  ): void {
    const id = createId('l')
    lecturers.value.push({ id, name, title, courseIds, church, linkedUsername })
  }

  function updateLecturer(
    id: string,
    name: string,
    title: string,
    courseIds: string[],
    church?: string,
    linkedUsername?: string
  ): void {
    const lec = lecturers.value.find((l) => l.id === id)
    if (lec) {
      lec.name = name
      lec.title = title
      lec.courseIds = courseIds
      if (church) lec.church = church
      // linkedUsername: pass undefined to keep existing, pass '' to clear, pass value to set
      if (linkedUsername !== undefined) {
        lec.linkedUsername = linkedUsername || undefined
      }
    }
  }

  function deleteLecturer(id: string): void {
    const index = lecturers.value.findIndex((l) => l.id === id)
    if (index > -1) {
      lecturers.value.splice(index, 1)
    }
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
   * 取得教師帳號在講師資料庫中的 linked 紀錄
   */
  function getLecturerByUsername(username: string): Lecturer | undefined {
    return lecturers.value.find((l) => l.linkedUsername === username)
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

  // Shining Project Actions

  /**
   * Read a student's Shining Project. Pure: never writes to the store.
   * Returns the stored project (same object, so watchers on it stay stable) or,
   * if the student has none yet, a fresh blank template that is NOT saved.
   * The auto-completed `courses30` item is not stored here — use isShiningChecked().
   */
  function getShiningProject(username: string): ShiningProject {
    return shiningProjectDb.value[username] ?? createBlankShiningProject()
  }

  /** Write paths only: get the stored project, creating it on first write. */
  function ensureShiningProject(username: string): ShiningProject {
    if (!shiningProjectDb.value[username]) {
      shiningProjectDb.value[username] = createBlankShiningProject()
    }
    return shiningProjectDb.value[username]
  }

  /** Number of courses in the current catalog that the student has completed. */
  function getCompletedCourseCount(username: string): number {
    const userRecords = progressDb.value[username]
    if (!userRecords) return 0
    return courses.value.filter((c) => userRecords[c.id]?.completed).length
  }

  /** Whether the student has completed every course in the current catalog. */
  function hasCompletedAllCourses(username: string): boolean {
    return courses.value.length > 0 && getCompletedCourseCount(username) >= courses.value.length
  }

  /**
   * Whether a Shining checklist item is checked: the stored value, or — for
   * `courses30` — automatically when every course has been completed.
   */
  function isShiningChecked(
    username: string,
    category: 'faithPhase1' | 'faithPhase2' | 'advancedChallenges',
    key: ShiningChecklistKey
  ): boolean {
    const checklist = getShiningProject(username)[category] as Record<string, boolean>
    if (checklist[key]) return true
    return category === 'faithPhase2' && key === 'courses30' && hasCompletedAllCourses(username)
  }

  function updateShiningBasicInfo(
    username: string,
    info: { name: string; birthday: string; church: string; schoolGrade: string }
  ): void {
    const project = ensureShiningProject(username)
    project.name = info.name
    project.birthday = info.birthday
    project.church = info.church
    project.schoolGrade = info.schoolGrade
  }

  function updateShiningChecklist(
    username: string,
    category: 'faithPhase1' | 'faithPhase2' | 'advancedChallenges',
    key: ShiningChecklistKey,
    value: boolean
  ): void {
    const project = ensureShiningProject(username)

    // Type casting to ensure typescript compatibility
    const checklist = project[category] as Record<string, boolean>
    checklist[key] = value
  }

  function updateShiningCustomChallenge(username: string, text: string): void {
    const project = ensureShiningProject(username)
    project.customChallenge = text
  }

  function updateShiningLecture(
    username: string,
    type: 'character' | 'comingOfAge',
    theme: string,
    speaker: string,
    date: string
  ): void {
    const project = ensureShiningProject(username)
    if (type === 'character') {
      project.characterLectures[theme] = { speaker, date }
    } else {
      project.comingOfAgeTopics[theme] = { speaker, date }
    }
  }

  // Church-based query functions
  function getStudentsByChurch(
    authUsersDb: Record<string, { role: string; church?: string }>,
    church: string
  ): string[] {
    return Object.keys(authUsersDb).filter((username) => {
      const user = authUsersDb[username]
      return user.role === 'student' && user.church === church
    })
  }

  function getTeachersByChurch(
    authUsersDb: Record<string, { role: string; church?: string }>,
    church: string
  ): string[] {
    return Object.keys(authUsersDb).filter((username) => {
      const u = authUsersDb[username]
      return u.role === 'teacher' && u.church === church
    })
  }

  function getPastorsByChurch(
    authUsersDb: Record<string, { role: string; church?: string }>,
    church: string
  ): string[] {
    return Object.keys(authUsersDb).filter((username) => {
      const u = authUsersDb[username]
      return u.role === 'pastor' && u.church === church
    })
  }

  function getParentsByChurch(
    authUsersDb: Record<string, { role: string; church?: string }>,
    church: string
  ): string[] {
    return Object.keys(authUsersDb).filter((username) => {
      const u = authUsersDb[username]
      return u.role === 'parent' && u.church === church
    })
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

  // ── Teaching Stats Actions ──────────────────────────────

  /**
   * 教師填報或更新某年度的教學人次統計
   */
  function saveTeachingStats(
    teacherUsername: string,
    year: number,
    church: string,
    stats: Omit<TeachingStats, 'teacherUsername' | 'year' | 'church' | 'submittedAt'>
  ): void {
    const key = `${teacherUsername}_${year}`
    teachingStatsDb.value[key] = {
      teacherUsername,
      year,
      church,
      ...stats,
      submittedAt: nowIso()
    }
  }

  /**
   * 取得指定教師在某年度的統計（若無則回傳預設空值）
   */
  function getTeachingStats(teacherUsername: string, year: number): TeachingStats {
    const key = `${teacherUsername}_${year}`
    return (
      teachingStatsDb.value[key] ?? {
        teacherUsername,
        year,
        church: '',
        oneOnOne30: 0,
        oneToMany30: 0,
        oneOnOneShining: 0,
        oneToManyShining: 0
      }
    )
  }

  /**
   * 取得所有教師的統計（可選年份篩選）；SS 中央用
   */
  function getAllTeachingStats(year?: number): TeachingStats[] {
    const all = Object.values(teachingStatsDb.value)
    if (year !== undefined) {
      return all.filter((s) => s.year === year)
    }
    return all
  }

  return {
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
    getThemesByChurch,
    addTheme,
    deleteTheme,
    updateTheme,
    getLecturersByChurch,
    addLecturer,
    updateLecturer,
    deleteLecturer,
    getShiningProject,
    getCompletedCourseCount,
    hasCompletedAllCourses,
    isShiningChecked,
    updateShiningBasicInfo,
    updateShiningChecklist,
    updateShiningCustomChallenge,
    updateShiningLecture,
    getStudentsByChurch,
    getTeachersByChurch,
    getPastorsByChurch,
    getParentsByChurch,
    getStudentsManagedByTeacher,
    getChurchSummaries,
    getLecturerStatsForChurch,
    saveTeachingStats,
    getTeachingStats,
    getAllTeachingStats,
    getLecturerByUsername,
    getActualTeachingCourseCounts
  }
})
