/**
 * @file src/stores/parts/shiningProject.ts
 * @description The courses store's Shining Project functions (閃耀計畫).
 */
import type { Ref } from 'vue'
import type {
  Course,
  ShiningProject,
  ShiningProjectDb,
  ShiningChecklistKey,
  UserProgressDb
} from '@/types/courses'
import { birthdayProblem, lectureEntryProblem } from '@/utils/recordRules'
import { refused, SAVED, type SaveResult } from '@/stores/parts/results'

/** A Shining Project with nothing filled in */
export function createBlankShiningProject(): ShiningProject {
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
export function withShiningDefaults(project: Partial<ShiningProject>): ShiningProject {
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

export function createShiningProject({
  shiningProjectDb,
  progressDb,
  courses
}: {
  shiningProjectDb: Ref<ShiningProjectDb>
  progressDb: Ref<UserProgressDb>
  courses: Ref<Course[]>
}) {
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
  ): SaveResult {
    const problem = birthdayProblem(info.birthday)
    if (problem) return refused(problem)
    const project = ensureShiningProject(username)
    project.name = info.name
    project.birthday = info.birthday
    project.church = info.church
    project.schoolGrade = info.schoolGrade
    return SAVED
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
  ): SaveResult {
    const problem = lectureEntryProblem({ speaker, date })
    if (problem) return refused(problem)
    speaker = speaker.trim()
    const project = ensureShiningProject(username)
    if (type === 'character') {
      project.characterLectures[theme] = { speaker, date }
    } else {
      project.comingOfAgeTopics[theme] = { speaker, date }
    }
    return SAVED
  }

  return {
    getShiningProject,
    getCompletedCourseCount,
    hasCompletedAllCourses,
    isShiningChecked,
    updateShiningBasicInfo,
    updateShiningChecklist,
    updateShiningCustomChallenge,
    updateShiningLecture
  }
}
