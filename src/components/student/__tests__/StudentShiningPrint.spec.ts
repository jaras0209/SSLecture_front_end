import { describe, it, expect, afterEach } from 'vitest'
import { DOMWrapper } from '@vue/test-utils'
import StudentShiningPrint from '@/components/student/StudentShiningPrint.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { mountPrepared, t } from '@/__tests__/helpers'

const CHURCH = '愛與話語'

/** The sheet is teleported to <body> */
function mountSheet(seed: () => void = () => {}) {
  const result = mountPrepared(
    StudentShiningPrint,
    () => {
      useAuthStore().currentUser = {
        username: 'student',
        role: 'student',
        loginMethod: 'credentials',
        church: CHURCH
      }
      seed()
    },
    { attachTo: document.body }
  )
  return { ...result, sheet: new DOMWrapper(document.body).find('.print-page-layout') }
}

describe('StudentShiningPrint', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it("prints the student's details, with blanks to fill in by hand where none are saved", () => {
    const { sheet } = mountSheet(() => {
      useCoursesStore().updateShiningBasicInfo('student', {
        name: '小明',
        birthday: '2012-05-01',
        church: CHURCH,
        schoolGrade: ''
      })
    })
    const values = sheet.findAll('.print-info-line strong').map((s) => s.text())
    expect(values).toEqual(['小明', '2012-05-01', CHURCH, '____________'])
  })

  it('marks the items the student has done', () => {
    const { sheet } = mountSheet(() => {
      useCoursesStore().updateShiningChecklist('student', 'faithPhase1', 'prayer', true)
    })
    const phase1 = sheet.findAll('.print-box')[1].findAll('.print-check-line')
    expect(phase1).toHaveLength(5)
    const marked = phase1.filter((l) => l.find('.print-check-circle.checked').exists())
    expect(marked.map((l) => l.text())).toEqual([`✓${t('teacher.studentList.phase1Prayer')}`])
  })

  it("lists this church's lecture themes", () => {
    const { sheet } = mountSheet()
    const themes = useCoursesStore().getThemesByChurch('character', CHURCH)
    const rows = sheet.findAll('.print-table')[0].findAll('tbody tr')
    expect(rows.map((r) => r.find('td').text())).toEqual(themes.map((th) => `✦ ${th}`))
  })

  it('names who signs: the assigned teacher and pastor, and the parents', () => {
    const { sheet } = mountSheet(() => {
      const courses = useCoursesStore()
      courses.assignStudentCaretaker('student', 'teacher', 'teacher')
      courses.assignStudentCaretaker('student', 'pastor', 'pastor')
    })
    const names = sheet.findAll('.print-sig-space').map((s) => s.text())
    expect(names).toEqual(['teacher', 'pastor', 'parent'])
  })
})
