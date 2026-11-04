import { describe, it, expect } from 'vitest'
import { LECTURER_TITLES, lecturerTitleCode, normalizeLecturerTitle } from '@/utils/lecturerTitle'
import zh from '@/i18n/locales/zh-TW.json'
import en from '@/i18n/locales/en.json'

describe('lecturer titles', () => {
  it('keeps a code as it is', () => {
    for (const code of LECTURER_TITLES) expect(lecturerTitleCode(code)).toBe(code)
  })

  it('understands the Chinese titles stored before codes were used', () => {
    expect(lecturerTitleCode('牧師')).toBe('pastor')
    expect(lecturerTitleCode('傳道')).toBe('preacher')
    expect(lecturerTitleCode('傳道人')).toBe('preacher')
    expect(lecturerTitleCode(' 師母 ')).toBe('pastor_wife')
    expect(lecturerTitleCode('輔導')).toBe('counselor')
    expect(lecturerTitleCode('特約講師')).toBe('guest')
  })

  it('leaves a title it does not know as written', () => {
    expect(lecturerTitleCode('執事')).toBeUndefined()
    expect(normalizeLecturerTitle('執事')).toBe('執事')
    expect(normalizeLecturerTitle('長老')).toBe('elder')
    expect(normalizeLecturerTitle('')).toBe('')
  })

  it('has a name for every title in both languages', () => {
    for (const locale of [zh, en]) {
      const names = locale.teacher.lecturer.titleOptions as Record<string, string>
      expect(Object.keys(names).sort()).toEqual([...LECTURER_TITLES].sort())
    }
  })
})
