/**
 * @file src/stores/parts/results.ts
 * @description What the courses and bookings stores' checked saves return.
 */
import { translate as t } from '@/i18n'
import { MAX_LENGTH } from '@/utils/limits'
import type { RuleProblem } from '@/utils/recordRules'

/** Outcome of a save that checks its input first */
export interface SaveResult {
  success: boolean
  message: string
}

/** Why a theme name can't be used (a key under stores.courses) */
export type ThemeProblem = 'themeRequired' | 'themeTooLong' | 'themeExists'

export const refused = (problem: RuleProblem | ThemeProblem): SaveResult => ({
  success: false,
  message: t(`stores.courses.${problem}`, {
    max: MAX_LENGTH.lecturerName,
    notesMax: MAX_LENGTH.sessionNotes,
    themeMax: MAX_LENGTH.themeName
  })
})
export const SAVED: SaveResult = { success: true, message: '' }
