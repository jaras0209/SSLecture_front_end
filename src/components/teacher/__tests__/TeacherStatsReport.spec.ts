import { describe, it, expect, afterEach, vi } from 'vitest'
import TeacherStatsReport from '@/components/teacher/TeacherStatsReport.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { UserRole } from '@/types/auth'
import { mountPrepared, t } from '@/__tests__/helpers'

const CHURCH = '愛與話語'
const YEAR = new Date().getFullYear()
const FIELDS = [
  'stat-one-on-one-30',
  'stat-one-to-many-30',
  'stat-one-on-one-shining',
  'stat-one-to-many-shining'
]

/** Sign in as `username`, run `seed`, then mount the report */
function mountReport(username = 'teacher', seed: () => void = () => {}) {
  return mountPrepared(TeacherStatsReport, () => {
    const auth = useAuthStore()
    auth.currentUser = {
      username,
      role: auth.usersDb[username].role as UserRole,
      loginMethod: 'credentials',
      church: auth.usersDb[username].church
    }
    seed()
  })
}

type Wrapper = ReturnType<typeof mountReport>['wrapper']

const fill = async (wrapper: Wrapper, values: (number | string)[]) => {
  for (const [i, id] of FIELDS.entries()) await wrapper.find(`#${id}`).setValue(values[i])
}
const subtotals = (wrapper: Wrapper) =>
  wrapper.findAll('.stats-subtotal strong').map((s) => s.text())
const total = (wrapper: Wrapper) => wrapper.find('.stats-total-num').text()

describe('TeacherStatsReport', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is only for teachers and admins', () => {
    expect(mountReport('teacher').wrapper.find('.stats-report-panel').exists()).toBe(true)
    expect(mountReport('admin').wrapper.find('.stats-report-panel').exists()).toBe(true)
    expect(mountReport('pastor').wrapper.find('.stats-report-panel').exists()).toBe(false)
  })

  it('labels every count field', () => {
    const { wrapper } = mountReport()
    for (const id of FIELDS) {
      expect(wrapper.find(`label[for="${id}"]`).exists(), id).toBe(true)
    }
  })

  it('adds up the counts as they are typed', async () => {
    const { wrapper } = mountReport()
    expect(total(wrapper)).toContain('0')
    await fill(wrapper, [3, 4, 5, 6])
    expect(subtotals(wrapper)).toEqual(['7', '11'])
    expect(total(wrapper)).toContain('18')
  })

  it('saves the year, shows when, and clears the note after a while', async () => {
    vi.useFakeTimers()
    const { wrapper } = mountReport()
    await fill(wrapper, [1, 2, 3, 4])
    await wrapper.find('#btn-save-stats').trigger('click')

    expect(useCoursesStore().getTeachingStats('teacher', YEAR)).toMatchObject({
      church: CHURCH,
      oneOnOne30: 1,
      oneToMany30: 2,
      oneOnOneShining: 3,
      oneToManyShining: 4
    })
    expect(wrapper.find('.stats-saved-msg').text()).toBe(t('teacher.stats.savedMsg'))
    expect(wrapper.find('.stats-last-submit').exists()).toBe(true)

    vi.advanceTimersByTime(3000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.stats-saved-msg').exists()).toBe(false)
  })

  it('counts blank, negative and fractional entries as whole people', async () => {
    const { wrapper } = mountReport()
    await fill(wrapper, ['', -5, 2.7, 3])
    expect(subtotals(wrapper)).toEqual(['0', '5'])

    await wrapper.find('#btn-save-stats').trigger('click')
    expect(useCoursesStore().getTeachingStats('teacher', YEAR)).toMatchObject({
      oneOnOne30: 0,
      oneToMany30: 0,
      oneOnOneShining: 2,
      oneToManyShining: 3
    })
    // the form shows what was saved
    expect((wrapper.find('#stat-one-to-many-30').element as HTMLInputElement).value).toBe('0')
  })

  it('loads what was saved for the chosen year', async () => {
    const { wrapper } = mountReport('teacher', () => {
      const stats = (n: number) => ({
        oneOnOne30: n,
        oneToMany30: n,
        oneOnOneShining: n,
        oneToManyShining: n
      })
      useCoursesStore().saveTeachingStats('teacher', YEAR, CHURCH, stats(2))
      useCoursesStore().saveTeachingStats('teacher', YEAR - 1, CHURCH, stats(9))
    })
    expect(total(wrapper)).toContain('8')

    await wrapper.find('select').setValue(String(YEAR - 1))
    expect(total(wrapper)).toContain('36')
    expect(wrapper.find('#btn-save-stats').text()).toBe(
      t('teacher.stats.saveBtn', { year: YEAR - 1 })
    )

    await wrapper.find('select').setValue(String(YEAR - 2)) // nothing saved
    expect(total(wrapper)).toContain('0')
    expect(wrapper.find('.stats-last-submit').exists()).toBe(false)
  })
})
