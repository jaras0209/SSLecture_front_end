/**
 * @file src/stores/parts/courseThemes.ts
 * @description The courses store's special-topic themes (專題大綱), per church.
 */
import type { Ref } from 'vue'
import type { ShiningProjectDb } from '@/types/courses'
import { membersOf } from '@/utils/scope'
import { useAuthStore } from '@/stores/auth'
import { translate as t } from '@/i18n'
import { MAX_LENGTH } from '@/utils/limits'
import { refused, SAVED, type SaveResult, type ThemeProblem } from '@/stores/parts/results'

export function createCourseThemes({
  characterThemesDb,
  comingOfAgeThemesDb,
  shiningProjectDb
}: {
  characterThemesDb: Ref<Record<string, string[]>>
  comingOfAgeThemesDb: Ref<Record<string, string[]>>
  shiningProjectDb: Ref<ShiningProjectDb>
}) {
  // Dynamic themes actions
  function getThemesByChurch(type: 'character' | 'comingOfAge', church: string): string[] {
    const db = type === 'character' ? characterThemesDb : comingOfAgeThemesDb
    return db.value[church] || []
  }

  /** Why `name` (trimmed) can't name a theme of the church, or null; `current` is the one renamed */
  function themeNameProblem(
    type: 'character' | 'comingOfAge',
    name: string,
    church: string,
    current?: string
  ): ThemeProblem | null {
    if (!name) return 'themeRequired'
    if (name.length > MAX_LENGTH.themeName) return 'themeTooLong'
    const themes = getThemesByChurch(type, church)
    if (name !== current && themes.includes(name)) return 'themeExists'
    return null
  }

  function addTheme(
    type: 'character' | 'comingOfAge',
    themeName: string,
    church: string
  ): SaveResult {
    const name = themeName.trim()
    const problem = themeNameProblem(type, name, church)
    if (problem) return refused(problem)
    const db = type === 'character' ? characterThemesDb : comingOfAgeThemesDb
    ;(db.value[church] ??= []).push(name)
    return SAVED
  }

  /** The church's students whose Shining Project records a lecture under this theme */
  function studentsWithThemeRecords(
    type: 'character' | 'comingOfAge',
    theme: string,
    church: string
  ): string[] {
    const field = type === 'character' ? 'characterLectures' : 'comingOfAgeTopics'
    return membersOf(useAuthStore().usersDb, 'student', church).filter(
      (username) => !!shiningProjectDb.value[username]?.[field][theme]
    )
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

  /**
   * Rename a theme. Students' Shining Project records are filed under the theme's name, so
   * theirs move to the new name too; otherwise they would vanish from every page.
   */
  function updateTheme(
    type: 'character' | 'comingOfAge',
    oldName: string,
    newName: string,
    church: string
  ): SaveResult {
    const name = newName.trim()
    const db = type === 'character' ? characterThemesDb : comingOfAgeThemesDb
    const index = db.value[church]?.indexOf(oldName) ?? -1
    if (index === -1) return { success: false, message: t('stores.courses.themeNotFound') }
    const problem = themeNameProblem(type, name, church, oldName)
    if (problem) return refused(problem)
    if (name === oldName) return SAVED

    const field = type === 'character' ? 'characterLectures' : 'comingOfAgeTopics'
    for (const username of studentsWithThemeRecords(type, oldName, church)) {
      const lectures = shiningProjectDb.value[username]![field]
      lectures[name] = lectures[oldName]!
      delete lectures[oldName]
    }
    db.value[church]![index] = name
    return SAVED
  }

  return { getThemesByChurch, addTheme, studentsWithThemeRecords, deleteTheme, updateTheme }
}
