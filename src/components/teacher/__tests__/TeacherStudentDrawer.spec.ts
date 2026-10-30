import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TeacherStudentDrawer from '@/components/teacher/TeacherStudentDrawer.vue'
import type { StudentProgressSummary } from '@/components/teacher/TeacherStudentList.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { setup, toastTexts, t } from '@/__tests__/helpers'

const summary: StudentProgressSummary = {
  username: 'student',
  avatarUrl: 'https://example.com/a.png',
  completedCount: 0,
  totalProgressPercent: 0,
  lastActive: '',
  records: []
}

/** Set up the stores as `role`, let `prepare` add data, then mount the drawer for `student` */
function mountDrawer(
  role: 'teacher' | 'parent',
  prepare: () => void = () => {},
  student = summary
) {
  const { plugins } = setup()
  const auth = useAuthStore()
  const u = auth.usersDb[role]
  auth.currentUser = { username: role, role: u.role, loginMethod: 'credentials', church: u.church }
  prepare()
  return mount(TeacherStudentDrawer, { props: { student }, global: { plugins } })
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('TeacherStudentDrawer', () => {
  it('shows the empty state without a student', () => {
    const wrapper = mountDrawer('teacher', undefined, null as unknown as StudentProgressSummary)
    expect(wrapper.find('.empty-drawer').exists()).toBe(true)
  })

  it("shows the student's Shining basic info, with a placeholder for what is missing", () => {
    const wrapper = mountDrawer('teacher', () =>
      useCoursesStore().updateShiningBasicInfo('student', {
        name: '小明',
        birthday: '',
        church: '愛與話語',
        schoolGrade: ''
      })
    )
    const text = wrapper.find('.shining-audit-panel').text()
    expect(text).toContain(`${t('teacher.drawer.fieldName')}：`)
    expect(text).toContain('小明')
    expect(text).toContain(t('teacher.drawer.notFilled'))
    expect(text).not.toMatch(/teacher\.drawer\.|profile\./) // no untranslated keys
  })

  it('reflects the checklist read-only', () => {
    const wrapper = mountDrawer('teacher', () =>
      useCoursesStore().updateShiningChecklist('student', 'faithPhase1', 'worship', true)
    )
    const rows = wrapper.findAll('.ro-check-row')
    expect(rows[0].classes()).toContain('active')
    expect(rows[0].text()).toContain('✅')
    expect(rows[1].text()).toContain('❌')
  })

  it('prefills and saves a lecture row', async () => {
    const wrapper = mountDrawer('teacher', () =>
      useCoursesStore().updateShiningLecture(
        'student',
        'character',
        '品格力 - 自律',
        '張牧師',
        '2026-09-01'
      )
    )
    const row = wrapper.findAll('.lecture-edit-row')[0]
    const [speaker, date] = row.findAll('input')
    expect((speaker.element as HTMLInputElement).value).toBe('張牧師')
    expect((date.element as HTMLInputElement).value).toBe('2026-09-01')

    await speaker.setValue('李長老')
    await row.find('button').trigger('click')
    expect(
      useCoursesStore().getShiningProject('student').characterLectures['品格力 - 自律']
    ).toMatchObject({
      speaker: '李長老',
      date: '2026-09-01'
    })
    expect(toastTexts().at(-1)).toContain('品格力 - 自律')
  })

  it('lets parents view lecture rows but not edit them', () => {
    const wrapper = mountDrawer('parent')
    expect(wrapper.findAll('.lecture-edit-row').length).toBeGreaterThan(0)
    expect(wrapper.find('.lecture-edit-row input').exists()).toBe(false)
    expect(wrapper.find('.inputs-row-readonly').exists()).toBe(true)
  })

  it('asks to close, to open the notes and prints', async () => {
    const print = vi.fn()
    vi.stubGlobal('print', print) // happy-dom has no window.print
    const wrapper = mountDrawer('teacher')
    await wrapper.find('.close-btn').trigger('click')
    await wrapper.findAll('.drawer-tab-btn')[0].trigger('click')
    await wrapper.find('.shining-audit-panel .btn-primary').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('open-notes')).toEqual([[summary]])
    expect(print).toHaveBeenCalledOnce()
  })
})
