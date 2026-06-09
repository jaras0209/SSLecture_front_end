import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface Course {
  id: string
  title: string
  category: 'bible' | 'lecture'
  speaker: string
  duration: number // in seconds
  description: string
  coverColor: string // CSS color code or gradient for card styling
}

export interface ProgressRecord {
  courseId: string
  durationListened: number // in seconds
  completed: boolean
  notes: string
  lastUpdated: string
  listenedAt?: string // student-registered datetime (formatted YYYY-MM-DDTHH:mm)
  lecturer?: string // student-selected lecturer
}

// Maps username to their course records
export type UserProgressDb = Record<string, Record<string, ProgressRecord>>

// Maps username to restricted pages they cannot access
export type PageRestrictionsDb = Record<string, string[]>

export interface StudentCaretakers {
  teacher?: string
  pastor?: string
  parent?: string
}

// Maps studentUsername -> caretakers
export type StudentTeacherDb = Record<string, StudentCaretakers>

// Shining Project structures
export interface ShiningProject {
  name: string
  birthday: string
  church: string
  schoolGrade: string
  faithPhase1: {
    worship: boolean
    prayer: boolean
    independent: boolean
    reply: boolean
    share: boolean
  }
  faithPhase2: {
    courses30: boolean
    prayerLong: boolean
    morningWorship: boolean
    readBible: boolean
    churchService: boolean
  }
  advancedChallenges: {
    wednesday: boolean
    shareFaith: boolean
    copySermon: boolean
    morningProverb: boolean
    custom: boolean
  }
  customChallenge: string
  characterLectures: Record<string, { speaker: string; date: string }>
  comingOfAgeTopics: Record<string, { speaker: string; date: string }>
}

export type ShiningProjectDb = Record<string, ShiningProject>

export interface Lecturer {
  id: string
  name: string
  title: string
  courseIds: string[]
  church?: string
}


export const useCoursesStore = defineStore('courses', () => {
  // Pre-configured cover colors gradients cyclic list
  const colors = [
    'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', // Blue
    'linear-gradient(135deg, #10B981 0%, #34D399 100%)', // Green
    'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', // Yellow
    'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', // Purple
    'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', // Pink
    'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)'  // Cyan
  ]
  const speakers = ['張牧師', '陳傳道', '李長老', '林輔導', '王老師']
  const durations = [180, 240, 200, 300, 220] // 3 to 5 minutes list

  const rawCoursesList = [
    { title: '聖經時觀', category: 'bible' },
    { title: '日月停止', category: 'bible' },
    { title: '彼得與釣魚', category: 'bible' },
    { title: '以利亞與烏鴉飯', category: 'bible' },
    { title: '三分說', category: 'bible' },
    { title: '七階段法則', category: 'bible' },
    { title: '火之概念', category: 'bible' },
    { title: '末世論', category: 'bible' },
    { title: '比喻論', category: 'bible' },
    { title: '洪水審判', category: 'bible' },
    { title: '無知中的相剋世界', category: 'bible' },
    { title: '預定論', category: 'bible' },
    { title: '異端的概念', category: 'bible' },
    { title: '中心人物論', category: 'bible' },
    { title: '復活論', category: 'bible' },
    { title: '三位一體', category: 'lecture' },
    { title: '聖子論', category: 'lecture' },
    { title: '再臨論', category: 'lecture' },
    { title: '空提論', category: 'lecture' },
    { title: '啟示論', category: 'lecture' },
    { title: '靈界論', category: 'lecture' },
    { title: '撒旦論', category: 'lecture' },
    { title: '該隱的個性', category: 'lecture' },
    { title: '罪與悔改', category: 'lecture' },
    { title: '創造目的', category: 'lecture' },
    { title: '墮落論', category: 'lecture' },
    { title: '施洗約翰與耶穌的關係使命', category: 'lecture' },
    { title: '兩棵橄欖樹與兩個見證人', category: 'lecture' },
    { title: '歷史論', category: 'lecture' },
    { title: '一載二載半載', category: 'lecture' }
  ] as const

  // Populate courses list
  const courses = ref<Course[]>(
    rawCoursesList.map((item, index) => {
      const id = `${item.category}-${(index + 1).toString().padStart(2, '0')}`
      return {
        id,
        title: item.title,
        category: item.category,
        speaker: speakers[index % speakers.length],
        duration: durations[index % durations.length],
        description: `精選聖經專題，帶您深入探討「${item.title}」的屬靈含義、歷史背景與信仰實踐。`,
        coverColor: colors[index % colors.length]
      }
    })
  )

  // Progress database (persistent)
  const progressDb = ref<UserProgressDb>({})
  const savedProgress = localStorage.getItem('superstart_progress_db')
  if (savedProgress) {
    progressDb.value = JSON.parse(savedProgress)
  }

  // Page restrictions database (persistent)
  const restrictionsDb = ref<PageRestrictionsDb>({})
  const savedRestrictions = localStorage.getItem('superstart_restrictions_db')
  if (savedRestrictions) {
    restrictionsDb.value = JSON.parse(savedRestrictions)
  }

  // Student-Teacher care assignments mapping database (persistent)
  const studentTeacherDb = ref<StudentTeacherDb>({})
  const savedStudentTeacher = localStorage.getItem('superstart_student_teacher_db')
  if (savedStudentTeacher) {
    try {
      const parsed = JSON.parse(savedStudentTeacher)
      const migrated: StudentTeacherDb = {}
      Object.keys(parsed).forEach(studentKey => {
        const val = parsed[studentKey]
        if (typeof val === 'string') {
          migrated[studentKey] = { teacher: val }
        } else if (val && typeof val === 'object') {
          migrated[studentKey] = val
        }
      })
      studentTeacherDb.value = migrated
    } catch (e) {
      console.error('Failed to parse and migrate studentTeacherDb:', e)
      studentTeacherDb.value = {}
    }
  }

  // Shining Project database (persistent)
  const shiningProjectDb = ref<ShiningProjectDb>({})
  const savedShining = localStorage.getItem('superstart_shining_project_db')
  if (savedShining) {
    shiningProjectDb.value = JSON.parse(savedShining)
  }

  // Dynamic themes (persistent)
  const characterThemesDb = ref<Record<string, string[]>>({
    '愛與話語': ['品格力 - 自律', '品格力 - 感謝', '品格力 - 勇氣', '品格力 - 正直']
  })
  const savedCharThemes = localStorage.getItem('superstart_character_themes_db')
  if (savedCharThemes) {
    try {
      const parsed = JSON.parse(savedCharThemes)
      if (Array.isArray(parsed)) {
        // Migrate old array
        characterThemesDb.value['愛與話語'] = parsed
      } else {
        characterThemesDb.value = parsed
      }
    } catch (e) {}
  }

  const comingOfAgeThemesDb = ref<Record<string, string[]>>({
    '愛與話語': ['基督教歷史', '台灣攝理歷史', '情感教育', 'R的使命與精神']
  })
  const savedAgeThemes = localStorage.getItem('superstart_coming_of_age_themes_db')
  if (savedAgeThemes) {
    try {
      const parsed = JSON.parse(savedAgeThemes)
      if (Array.isArray(parsed)) {
        // Migrate old array
        comingOfAgeThemesDb.value['愛與話語'] = parsed
      } else {
        comingOfAgeThemesDb.value = parsed
      }
    } catch (e) {}
  }

  // Lecturers list (persistent)
  const lecturers = ref<Lecturer[]>([])
  const savedLecturers = localStorage.getItem('superstart_lecturers_db')
  if (savedLecturers) {
    lecturers.value = JSON.parse(savedLecturers)
    // Migrate existing to have church
    lecturers.value.forEach(l => {
      if (!l.church) l.church = '愛與話語'
    })
  } else {
    // Default initial mock database
    lecturers.value = [
      { id: 'l1', name: '張牧師', title: '牧師', courseIds: ['bible-01', 'bible-02', 'bible-03', 'bible-04', 'bible-05', 'bible-06', 'bible-07', 'bible-08', 'bible-09', 'bible-10'], church: '愛與話語' },
      { id: 'l2', name: '陳傳道', title: '傳道', courseIds: ['bible-11', 'bible-12', 'bible-13', 'bible-14', 'bible-15', 'lecture-01', 'lecture-02', 'lecture-03', 'lecture-04', 'lecture-05'], church: '愛與話語' },
      { id: 'l3', name: '林輔導', title: '輔導', courseIds: ['lecture-06', 'lecture-07', 'lecture-08', 'lecture-09', 'lecture-10', 'lecture-11', 'lecture-12', 'lecture-13', 'lecture-14', 'lecture-15'], church: '愛與話語' }
    ]
  }

  // Watchers to persist state
  watch(progressDb, (newDb) => {
    localStorage.setItem('superstart_progress_db', JSON.stringify(newDb))
  }, { deep: true })

  watch(restrictionsDb, (newDb) => {
    localStorage.setItem('superstart_restrictions_db', JSON.stringify(newDb))
  }, { deep: true })

  watch(studentTeacherDb, (newDb) => {
    localStorage.setItem('superstart_student_teacher_db', JSON.stringify(newDb))
  }, { deep: true })

  watch(shiningProjectDb, (newDb) => {
    localStorage.setItem('superstart_shining_project_db', JSON.stringify(newDb))
  }, { deep: true })

  watch(characterThemesDb, (newThemes) => {
    localStorage.setItem('superstart_character_themes_db', JSON.stringify(newThemes))
  }, { deep: true })

  watch(comingOfAgeThemesDb, (newThemes) => {
    localStorage.setItem('superstart_coming_of_age_themes_db', JSON.stringify(newThemes))
  }, { deep: true })

  watch(lecturers, (newLecturers) => {
    localStorage.setItem('superstart_lecturers_db', JSON.stringify(newLecturers))
  }, { deep: true })

  // Blank template initializer
  function createBlankShiningProject(): ShiningProject {
    const charLectures: Record<string, { speaker: string; date: string }> = {}
    const ageTopics: Record<string, { speaker: string; date: string }> = {}

    return {
      name: '',
      birthday: '',
      church: '',
      schoolGrade: '',
      faithPhase1: { worship: false, prayer: false, independent: false, reply: false, share: false },
      faithPhase2: { courses30: false, prayerLong: false, morningWorship: false, readBible: false, churchService: false },
      advancedChallenges: { wednesday: false, shareFaith: false, copySermon: false, morningProverb: false, custom: false },
      customChallenge: '',
      characterLectures: charLectures,
      comingOfAgeTopics: ageTopics
    }
  }


  // Actions
  function updateProgress(
    username: string, 
    courseId: string, 
    durationListened: number, 
    notes: string,
    listenedAt?: string,
    lecturer?: string
  ): void {
    if (!progressDb.value[username]) {
      progressDb.value[username] = {}
    }

    const course = courses.value.find(c => c.id === courseId)
    if (!course) return

    const previousRecord = progressDb.value[username][courseId]
    const completed = durationListened >= course.duration * 0.98 || (previousRecord ? previousRecord.completed : false)
    const finalDuration = Math.min(durationListened, course.duration)

    progressDb.value[username][courseId] = {
      courseId,
      durationListened: finalDuration,
      completed,
      notes: notes.trim() !== '' ? notes : (previousRecord?.notes || ''),
      lastUpdated: new Date().toLocaleString('zh-TW', { hour12: false }),
      listenedAt: listenedAt || previousRecord?.listenedAt || new Date().toISOString().slice(0, 16),
      lecturer: lecturer || previousRecord?.lecturer || ''
    }
  }

  function getStudentProgress(username: string, courseId: string): ProgressRecord {
    const userRecords = progressDb.value[username]
    if (userRecords && userRecords[courseId]) {
      return userRecords[courseId]
    }
    return {
      courseId,
      durationListened: 0,
      completed: false,
      notes: '',
      lastUpdated: ''
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
  function assignStudentCaretaker(studentUsername: string, role: 'teacher' | 'pastor' | 'parent', username: string): void {
    if (!studentTeacherDb.value[studentUsername] || typeof studentTeacherDb.value[studentUsername] !== 'object') {
      studentTeacherDb.value[studentUsername] = {}
    }
    studentTeacherDb.value[studentUsername][role] = username
    studentTeacherDb.value = { ...studentTeacherDb.value }
  }

  function removeStudentCaretaker(studentUsername: string, role: 'teacher' | 'pastor' | 'parent'): void {
    if (studentTeacherDb.value[studentUsername] && typeof studentTeacherDb.value[studentUsername] === 'object') {
      delete studentTeacherDb.value[studentUsername][role]
      if (Object.keys(studentTeacherDb.value[studentUsername]).length === 0) {
        delete studentTeacherDb.value[studentUsername]
      }
      studentTeacherDb.value = { ...studentTeacherDb.value }
    }
  }

  function getStudentCaretaker(studentUsername: string, role: 'teacher' | 'pastor' | 'parent'): string {
    const caretakers = studentTeacherDb.value[studentUsername]
    if (caretakers && typeof caretakers === 'object') {
      return caretakers[role] || ''
    }
    return ''
  }

  // Backwards compatibility actions
  function assignStudentToTeacher(studentUsername: string, teacherUsername: string): void {
    assignStudentCaretaker(studentUsername, 'teacher', teacherUsername)
  }

  function removeStudentFromTeacher(studentUsername: string): void {
    removeStudentCaretaker(studentUsername, 'teacher')
  }

  function getStudentTeacher(studentUsername: string): string {
    return getStudentCaretaker(studentUsername, 'teacher')
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

  function updateTheme(type: 'character' | 'comingOfAge', oldName: string, newName: string, church: string): void {
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
    return lecturers.value.filter(l => l.church === church || !l.church)
  }

  function addLecturer(name: string, title: string, courseIds: string[], church: string): void {
    const id = 'l_' + Date.now()
    lecturers.value.push({ id, name, title, courseIds, church })
  }

  function updateLecturer(id: string, name: string, title: string, courseIds: string[], church?: string): void {
    const lec = lecturers.value.find(l => l.id === id)
    if (lec) {
      lec.name = name
      lec.title = title
      lec.courseIds = courseIds
      if (church) lec.church = church
    }
  }

  function deleteLecturer(id: string): void {
    const index = lecturers.value.findIndex(l => l.id === id)
    if (index > -1) {
      lecturers.value.splice(index, 1)
    }
  }

  // Shining Project Actions
  function getShiningProject(username: string): ShiningProject {
    if (!shiningProjectDb.value[username]) {
      shiningProjectDb.value[username] = createBlankShiningProject()
    }
    
    // Check missing dynamic themes if store dynamic list changed
    const proj = shiningProjectDb.value[username]
    if (!proj.characterLectures) {
      proj.characterLectures = {}
    }
    if (!proj.comingOfAgeTopics) {
      proj.comingOfAgeTopics = {}
    }
    
    // Auto check 'courses30' if the student completed all 30 courses
    const userRecords = progressDb.value[username]
    if (userRecords) {
      const completedCount = Object.values(userRecords).filter(r => r.completed).length
      if (completedCount >= courses.value.length) {
        shiningProjectDb.value[username].faithPhase2.courses30 = true
      }
    }

    return shiningProjectDb.value[username]
  }

  function updateShiningBasicInfo(
    username: string, 
    info: { name: string; birthday: string; church: string; schoolGrade: string }
  ): void {
    const project = getShiningProject(username)
    project.name = info.name
    project.birthday = info.birthday
    project.church = info.church
    project.schoolGrade = info.schoolGrade
  }

  function updateShiningChecklist(
    username: string, 
    category: 'faithPhase1' | 'faithPhase2' | 'advancedChallenges', 
    key: 'worship' | 'prayer' | 'independent' | 'reply' | 'share' | 'courses30' | 'prayerLong' | 'morningWorship' | 'readBible' | 'churchService' | 'wednesday' | 'shareFaith' | 'copySermon' | 'morningProverb' | 'custom', 
    value: boolean
  ): void {
    const project = getShiningProject(username)
    
    // Type casting to ensure typescript compatibility
    const checklist = project[category] as Record<string, boolean>
    checklist[key] = value
  }



  function updateShiningCustomChallenge(username: string, text: string): void {
    const project = getShiningProject(username)
    project.customChallenge = text
  }

  function updateShiningLecture(
    username: string, 
    type: 'character' | 'comingOfAge', 
    theme: string, 
    speaker: string, 
    date: string
  ): void {
    const project = getShiningProject(username)
    if (type === 'character') {
      project.characterLectures[theme] = { speaker, date }
    } else {
      project.comingOfAgeTopics[theme] = { speaker, date }
    }
  }

  // Church-based query functions
  function getStudentsByChurch(authUsersDb: Record<string, { role: string; church?: string }>, church: string): string[] {
    return Object.keys(authUsersDb).filter(username => {
      const user = authUsersDb[username]
      return user.role === 'student' && user.church === church
    })
  }

  function getTeachersByChurch(authUsersDb: Record<string, { role: string; church?: string }>, church: string): string[] {
    return Object.keys(authUsersDb).filter(username => {
      const u = authUsersDb[username]
      return u.role === 'teacher' && u.church === church
    })
  }

  function getPastorsByChurch(authUsersDb: Record<string, { role: string; church?: string }>, church: string): string[] {
    return Object.keys(authUsersDb).filter(username => {
      const u = authUsersDb[username]
      return u.role === 'pastor' && u.church === church
    })
  }

  function getParentsByChurch(authUsersDb: Record<string, { role: string; church?: string }>, church: string): string[] {
    return Object.keys(authUsersDb).filter(username => {
      const u = authUsersDb[username]
      return u.role === 'parent' && u.church === church
    })
  }

  function getStudentsManagedByTeacher(teacherUsername: string): string[] {
    const managed: string[] = []
    Object.keys(studentTeacherDb.value).forEach(studentUsername => {
      const caretakers = studentTeacherDb.value[studentUsername]
      if (caretakers && typeof caretakers === 'object' && caretakers.teacher === teacherUsername) {
        managed.push(studentUsername)
      }
    })
    return managed
  }

  function getChurchSummaries(authUsersDb: Record<string, { role: string; church?: string }>): { church: string; teacherCount: number; studentCount: number }[] {
    const churchMap: Record<string, { teacherCount: number; studentCount: number }> = {}
    Object.keys(authUsersDb).forEach(username => {
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

    churchStudents.forEach(studentUsername => {
      const userRecords = progressDb.value[studentUsername]
      if (!userRecords) return
      Object.values(userRecords).forEach(record => {
        if (record.lecturer && record.lecturer.trim() !== '') {
          const name = record.lecturer.trim()
          lecturerCounts[name] = (lecturerCounts[name] || 0) + 1
        }
      })
    })

    return Object.entries(lecturerCounts)
      .map(([lecturerName, sessionCount]) => ({ lecturerName, sessionCount }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
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
    updateProgress,
    getStudentProgress,
    toggleRestriction,
    isPageRestricted,
    assignStudentToTeacher,
    removeStudentFromTeacher,
    getStudentTeacher,
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
    getLecturerStatsForChurch
  }
})

