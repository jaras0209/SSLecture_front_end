/**
 * @file src/stores/parts/courseLecturers.ts
 * @description The courses store's lecturer list (講師).
 */
import type { Ref } from 'vue'
import type { Lecturer } from '@/types/courses'
import { createId } from '@/utils/id'
import { normalizeLecturerTitle } from '@/utils/lecturerTitle'
import { translate as t } from '@/i18n'
import { MAX_LENGTH } from '@/utils/limits'
import { refused, SAVED, type SaveResult } from '@/stores/parts/results'

export function createCourseLecturers({ lecturers }: { lecturers: Ref<Lecturer[]> }) {
  // Lecturer actions
  function getLecturersByChurch(church: string): Lecturer[] {
    return lecturers.value.filter((l) => l.church === church || !l.church)
  }

  /**
   * Why a lecturer can't be saved, or null: a name is needed; the church can't list the same
   * lecturer (name and title) twice, or students and teachers couldn't tell the two apart in
   * the menus; and an account goes with one lecturer entry, whose lectures are its「我的授課」.
   * `id` is the lecturer being edited, if any.
   */
  function lecturerProblem(
    entry: { name: string; title: string; church?: string; linkedUsername?: string },
    id?: string
  ): SaveResult | null {
    const name = entry.name.trim()
    if (!name) return { success: false, message: t('stores.courses.lecturerNameRequired') }
    if (name.length > MAX_LENGTH.lecturerName) return refused('lecturerTooLong')
    const title = normalizeLecturerTitle(entry.title)
    const others = lecturers.value.filter((l) => l.id !== id)
    const church = entry.church ?? lecturers.value.find((l) => l.id === id)?.church
    const sameChurch = others.filter((l) => !l.church || !church || l.church === church)
    if (sameChurch.some((l) => l.name.trim() === name && l.title === title)) {
      return { success: false, message: t('stores.courses.lecturerExists', { name }) }
    }
    const linked =
      entry.linkedUsername && others.find((l) => l.linkedUsername === entry.linkedUsername)
    if (linked) {
      return {
        success: false,
        message: t('stores.courses.lecturerAccountLinked', {
          username: entry.linkedUsername,
          name: linked.name
        })
      }
    }
    return null
  }

  function addLecturer(
    name: string,
    title: string,
    courseIds: string[],
    church: string,
    linkedUsername?: string
  ): SaveResult {
    const problem = lecturerProblem({ name, title, church, linkedUsername })
    if (problem) return problem
    const id = createId('l')
    lecturers.value.push({
      id,
      name: name.trim(),
      title: normalizeLecturerTitle(title),
      courseIds,
      church,
      linkedUsername
    })
    return SAVED
  }

  function updateLecturer(
    id: string,
    name: string,
    title: string,
    courseIds: string[],
    church?: string,
    linkedUsername?: string
  ): SaveResult {
    const lec = lecturers.value.find((l) => l.id === id)
    if (!lec) return { success: false, message: t('stores.courses.lecturerNotFound') }
    const problem = lecturerProblem({ name, title, church, linkedUsername }, id)
    if (problem) return problem
    {
      lec.name = name.trim()
      lec.title = normalizeLecturerTitle(title)
      lec.courseIds = courseIds
      if (church) lec.church = church
      // linkedUsername: pass undefined to keep existing, pass '' to clear, pass value to set
      if (linkedUsername !== undefined) {
        lec.linkedUsername = linkedUsername || undefined
      }
    }
    return SAVED
  }

  /** The lecturer entry an account is linked to, if any */
  function lecturerLinkedTo(username: string): Lecturer | undefined {
    return lecturers.value.find((l) => l.linkedUsername === username)
  }

  function deleteLecturer(id: string): void {
    const index = lecturers.value.findIndex((l) => l.id === id)
    if (index > -1) {
      lecturers.value.splice(index, 1)
    }
  }

  /**
   * 取得教師帳號在講師資料庫中的 linked 紀錄
   */
  function getLecturerByUsername(username: string): Lecturer | undefined {
    return lecturers.value.find((l) => l.linkedUsername === username)
  }

  return {
    getLecturersByChurch,
    addLecturer,
    updateLecturer,
    deleteLecturer,
    lecturerLinkedTo,
    getLecturerByUsername
  }
}
