import { describe, it, expect, afterEach, vi } from 'vitest'
import { DOMWrapper } from '@vue/test-utils'
import AdminDashboard from '@/views/AdminDashboard.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { mountPrepared, t } from '@/__tests__/helpers'
import { noteBackup } from '@/utils/backup'

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

  describe('reminding to back up', () => {
    const DAY = 24 * 60 * 60 * 1000
    afterEach(() => {
      sessionStorage.clear()
      vi.restoreAllMocks()
    })

    it('reminds when this computer never made a backup', () => {
      const { wrapper } = mountAdmin()
      const reminder = wrapper.find('.backup-reminder')
      expect(reminder.attributes('role')).toBe('status')
      expect(reminder.text()).toContain(t('admin.backup.remind.never'))
    })

    it('says how old the last backup is once it is over a week', () => {
      const { wrapper } = mountAdmin(() => noteBackup(Date.now() - 10 * DAY))
      expect(wrapper.find('.backup-reminder').text()).toContain(
        t('admin.backup.remind.stale', { days: 10 })
      )
    })

    it('stays quiet within a week of the last backup', () => {
      const { wrapper } = mountAdmin(() => noteBackup(Date.now() - 2 * DAY))
      expect(wrapper.find('.backup-reminder').exists()).toBe(false)
    })

    it('can wait until the browser is next opened', async () => {
      const { wrapper } = mountAdmin()
      await wrapper.findAll('.backup-reminder button')[1].trigger('click')
      expect(wrapper.find('.backup-reminder').exists()).toBe(false)
      wrapper.unmount()
      expect(mountAdmin().wrapper.find('.backup-reminder').exists()).toBe(false)
    })

    it('takes the admin to the export button, and goes away once a backup is made', async () => {
      const { wrapper } = mountAdmin()
      const scroll = vi.fn()
      Element.prototype.scrollIntoView = scroll // happy-dom has none
      await wrapper.findAll('.backup-reminder button')[0].trigger('click')
      expect(scroll).toHaveBeenCalled()
      expect(document.activeElement?.id).toBe('btn-export-backup')

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      await wrapper.find('#btn-export-backup').trigger('click')
      expect(wrapper.find('.backup-reminder').exists()).toBe(false)
    })
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
