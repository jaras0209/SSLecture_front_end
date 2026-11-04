/**
 * 講師稱謂以代碼儲存（如 `pastor`），顯示時依介面語言翻譯
 * （`teacher.lecturer.titleOptions.{code}`）。早期資料存的是中文字（如「牧師」），
 * 讀取時一併換成代碼；認不得的稱謂原樣顯示。
 */

export const LECTURER_TITLES = [
  'lecturer',
  'pastor',
  'preacher',
  'elder',
  'pastor_wife',
  'counselor',
  'guest'
] as const

export type LecturerTitle = (typeof LECTURER_TITLES)[number]

/** Titles stored as Chinese text before they were stored as codes */
const LEGACY_TITLES: Record<string, LecturerTitle> = {
  講師: 'lecturer',
  牧師: 'pastor',
  傳道人: 'preacher',
  傳道: 'preacher',
  長老: 'elder',
  師母: 'pastor_wife',
  輔導: 'counselor',
  特約講師: 'guest'
}

/** The code for a stored title (a code already, or the Chinese text it used to be), if known */
export function lecturerTitleCode(value: string): LecturerTitle | undefined {
  if ((LECTURER_TITLES as readonly string[]).includes(value)) return value as LecturerTitle
  return LEGACY_TITLES[value.trim()]
}

/** A stored title as a code where one is known; anything else is kept as written */
export function normalizeLecturerTitle(value: string): string {
  return lecturerTitleCode(value) ?? value
}
