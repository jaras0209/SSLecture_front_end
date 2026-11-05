import { describe, it, expect, afterEach, vi } from 'vitest'
import StudentShiningDashboard from '@/components/student/StudentShiningDashboard.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { mountPrepared, t } from '@/__tests__/helpers'

const CHURCH = '愛與話語'

/** Sign in as the demo student, run `seed`, then mount the Shining page */
function mountShining(seed: () => void = () => {}) {
  return mountPrepared(
    StudentShiningDashboard,
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
}

type Wrapper = ReturnType<typeof mountShining>['wrapper']

const project = () => useCoursesStore().getShiningProject('student')
/** The checkboxes of one card: 0 = phase 1, 1 = phase 2, 2 = advanced */
const boxes = (wrapper: Wrapper, card: number) =>
  wrapper.findAll('.checklist-card')[card].findAll<HTMLInputElement>('input[type="checkbox"]')
const value = (wrapper: Wrapper, id: string) =>
  wrapper.find<HTMLInputElement>(`#${id}`).element.value

describe('StudentShiningDashboard', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('fills the form with what was saved', () => {
    const { wrapper } = mountShining(() => {
      useCoursesStore().updateShiningBasicInfo('student', {
        name: '小明',
        birthday: '2012-05-01',
        church: CHURCH,
        schoolGrade: '國一'
      })
      useCoursesStore().updateShiningCustomChallenge('student', '每天背一節經文')
    })
    expect(value(wrapper, 'shining-name')).toBe('小明')
    expect(value(wrapper, 'shining-birthday')).toBe('2012-05-01')
    expect(value(wrapper, 'shining-school')).toBe('國一')
    expect(wrapper.find<HTMLInputElement>('.form-input-clean-custom').element.value).toBe(
      '每天背一節經文'
    )
  })

  it('saves the basic info and says so for a moment', async () => {
    vi.useFakeTimers()
    const { wrapper } = mountShining()
    await wrapper.find('#shining-name').setValue('小明')
    await wrapper.find('#shining-school').setValue('國一')
    await wrapper.find('.shining-card-basic .btn-secondary').trigger('click')
    expect(project()).toMatchObject({ name: '小明', schoolGrade: '國一' })
    expect(wrapper.find('.save-alert-msg').text()).toBe(t('student.shining.saveMsgSuccess'))

    vi.advanceTimersByTime(3000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.save-alert-msg').exists()).toBe(false)
  })

  it('keeps unsaved input while items are ticked', async () => {
    const { wrapper } = mountShining()
    await wrapper.find('#shining-name').setValue('還沒存')
    await boxes(wrapper, 0)[0].setValue(true)
    expect(value(wrapper, 'shining-name')).toBe('還沒存')
  })

  it('ticks and unticks checklist items', async () => {
    const { wrapper } = mountShining()
    await boxes(wrapper, 0)[1].setValue(true) // phase 1: prayer
    await boxes(wrapper, 2)[0].setValue(true) // advanced: wednesday
    expect(project().faithPhase1.prayer).toBe(true)
    expect(project().advancedChallenges.wednesday).toBe(true)
    expect(boxes(wrapper, 0)[1].element.checked).toBe(true)

    await boxes(wrapper, 0)[1].setValue(false)
    expect(project().faithPhase1.prayer).toBe(false)
  })

  it('saves the custom challenge when leaving the field', async () => {
    const { wrapper } = mountShining()
    const input = wrapper.find('.form-input-clean-custom')
    await input.setValue('每天背一節經文')
    expect(project().customChallenge ?? '').toBe('') // not while typing
    await input.trigger('blur')
    expect(project().customChallenge).toBe('每天背一節經文')
  })

  it('counts the courses heard, and leaves "all 30" to be ticked by hand until then', async () => {
    const { wrapper } = mountShining(() => {
      const courses = useCoursesStore()
      courses.addListenSession('student', courses.courses[0].id, {
        lecturer: '',
        listenedAt: '2026-03-01T19:30',
        notes: ''
      })
    })
    const all30 = boxes(wrapper, 1)[0]
    expect(wrapper.find('.progress-sub').text()).toBe(
      t('student.shining.phase2ProgressSub', { count: 1 })
    )
    expect(all30.element.checked).toBe(false)
    expect(all30.element.disabled).toBe(false)
  })

  it('ticks "all 30" by itself once every course is done, and keeps it ticked', async () => {
    const { wrapper } = mountShining(() => {
      const courses = useCoursesStore()
      courses.courses.forEach((c) =>
        courses.addListenSession('student', c.id, {
          lecturer: '',
          listenedAt: '2026-03-01T19:30',
          notes: ''
        })
      )
    })
    const all30 = boxes(wrapper, 1)[0]
    expect(all30.element.checked).toBe(true)
    expect(all30.element.disabled).toBe(true) // can't be unticked: the progress says it's done
  })

  it('shows the lectures recorded for each theme', () => {
    const { wrapper } = mountShining(() => {
      const courses = useCoursesStore()
      const [theme] = courses.getThemesByChurch('character', CHURCH)
      courses.updateShiningLecture('student', 'character', theme, '王講師', '2026-02-01')
    })
    const first = wrapper.findAll('.shining-lecture-table')[0].find('tbody tr')
    expect(first.text()).toContain('王講師')
    expect(first.text()).toContain('2026-02-01')
  })

  it('prints the sheet', async () => {
    const print = vi.fn()
    vi.stubGlobal('print', print) // happy-dom has no window.print
    const { wrapper } = mountShining()
    await wrapper.find('.shining-toolbar .btn-primary').trigger('click')
    expect(print).toHaveBeenCalledOnce()
  })
})
