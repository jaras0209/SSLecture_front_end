import { describe, it, expect, afterEach, vi } from 'vitest'
import { DOMWrapper } from '@vue/test-utils'
import AdminDashboard from '@/views/AdminDashboard.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { mountPrepared, t } from '@/__tests__/helpers'

const CHURCH = '愛與話語'
const OTHER = '主大明'

function mountAdmin(seed: () => void = () => {}) {
  return mountPrepared(
    AdminDashboard,
    () => {
      useAuthStore().currentUser = {
        username: 'admin',
        role: 'admin',
        loginMethod: 'credentials',
        displayName: '總管',
        lastLoginAt: '2026-10-01T09:30:00.000Z'
      }
      seed()
    },
    { attachTo: document.body }
  )
}

type Wrapper = ReturnType<typeof mountAdmin>['wrapper']

const statsRows = (wrapper: Wrapper) =>
  wrapper.findAll('.stats-table tbody tr:not(.stats-grand-total-row)')

describe('AdminDashboard', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('greets the admin, shows their last sign-in and opens the profile', async () => {
    const { wrapper } = mountAdmin()
    expect(wrapper.find('.page-title').text()).toBe(t('admin.header.title'))
    expect(wrapper.text()).toContain(t('admin.header.desc', { name: '總管' }))
    expect(wrapper.text()).toContain('🕐')

    const body = new DOMWrapper(document.body)
    await wrapper.find('.admin-avatar-wrap').trigger('keydown', { key: 'Enter' })
    await vi.waitFor(() => expect(body.find('[role="dialog"]').exists()).toBe(true))
  })

  it('lays out every admin section', () => {
    const { wrapper } = mountAdmin()
    for (const name of [
      'AdminCreateUserPanel',
      'AdminUserTable',
      'AdminChurchOverview',
      'AdminTeachingStats',
      'AdminInviteCodes'
    ]) {
      expect(wrapper.findComponent({ name }).exists(), name).toBe(true)
    }
  })

  it('summarises each church and lists its people on demand', async () => {
    const { wrapper } = mountAdmin(() => {
      const auth = useAuthStore()
      auth.usersDb.t2 = { passwordHash: 'x', role: 'teacher', church: CHURCH, realName: '林老師' }
      auth.usersDb.sx = { passwordHash: 'x', role: 'student', church: OTHER }
    })
    const card = (church: string) =>
      wrapper.findAll('.church-card').find((c) => c.find('.church-card-name').text() === church)!
    const counts = (church: string) =>
      card(church)
        .findAll('.church-stat-val')
        .map((v) => v.text())
    expect(counts(CHURCH).slice(0, 2)).toEqual(['2', '1']) // teachers, students
    expect(counts(OTHER).slice(0, 2)).toEqual(['0', '1'])

    await card(CHURCH).find('.church-card-btn').trigger('click')
    const detail = card(CHURCH).find('.church-card-detail')
    expect(detail.findAll('.chip-teacher').map((c) => c.text())).toEqual([
      '✍️ teacher',
      '✍️ 林老師'
    ])
    expect(detail.findAll('.chip-student').length).toBe(1)

    // one church open at a time; pressing again closes it
    await card(OTHER).find('.church-card-btn').trigger('click')
    expect(card(CHURCH).find('.church-card-detail').exists()).toBe(false)
    await card(OTHER).find('.church-card-btn').trigger('click')
    expect(wrapper.find('.church-card-detail').exists()).toBe(false)
  })

  it('totals the teaching stats of the chosen year', async () => {
    const year = new Date().getFullYear()
    const { wrapper } = mountAdmin(() => {
      const courses = useCoursesStore()
      const stats = (n: number) => ({
        oneOnOne30: n,
        oneToMany30: n,
        oneOnOneShining: n,
        oneToManyShining: n
      })
      courses.saveTeachingStats('teacher', year, CHURCH, stats(1))
      courses.saveTeachingStats('t2', year, OTHER, stats(2))
      courses.saveTeachingStats('teacher', year - 1, CHURCH, stats(5))
      courses.addLecturer('teacher 本人', '講師', ['bible-01', 'bible-02'], CHURCH, 'teacher')
    })
    expect(statsRows(wrapper)).toHaveLength(2)
    const totalRow = wrapper.find('.stats-grand-total-row')
    expect(
      totalRow
        .findAll('strong')
        .map((s) => s.text())
        .slice(1)
    ).toEqual(['3', '3', '3', '3'])
    expect(totalRow.find('.badge-total').text()).toBe('12')
    // the teacher linked to a lecturer record shows it
    expect(statsRows(wrapper)[1].text()).toContain(t('admin.statsOverview.courseSuffix', { n: 2 }))

    await wrapper.find('.admin-stats-overview select').setValue(String(year - 1))
    expect(statsRows(wrapper)).toHaveLength(1)
    expect(wrapper.find('.stats-grand-total-row .badge-total').text()).toBe('20')

    await wrapper.find('.admin-stats-overview select').setValue(String(year - 2))
    expect(wrapper.find('.admin-stats-overview .empty-row').text()).toBe(
      t('admin.statsOverview.emptyRow', { year: year - 2 })
    )
  })
})
