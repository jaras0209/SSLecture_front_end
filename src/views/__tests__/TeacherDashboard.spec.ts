import { describe, it, expect, afterEach, vi } from 'vitest'
import TeacherDashboard from '@/views/TeacherDashboard.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import type { UserRole } from '@/types/auth'
import { mountPrepared, t } from '@/__tests__/helpers'

const CHURCH = '愛與話語'

/** Sign in as one of the demo accounts, run `seed`, then mount the dashboard */
async function mountAs(username: string, seed: () => void = () => {}) {
  const result = mountPrepared(
    TeacherDashboard,
    () => {
      const auth = useAuthStore()
      const account = auth.usersDb[username]
      auth.currentUser = {
        username,
        role: account.role as UserRole,
        loginMethod: 'credentials',
        church: account.church
      }
      seed()
    },
    { attachTo: document.body }
  )
  // The tab contents are loaded on demand
  await vi.waitFor(() =>
    expect(result.wrapper.findComponent({ name: 'TeacherStudentList' }).exists()).toBe(true)
  )
  return result
}

/** Wait until an on-demand part of the page has rendered */
const rendered = (wrapper: Awaited<ReturnType<typeof mountAs>>['wrapper'], selector: string) =>
  vi.waitFor(() => expect(wrapper.find(selector).exists()).toBe(true))

const tabTexts = (wrapper: Awaited<ReturnType<typeof mountAs>>['wrapper']) =>
  wrapper.findAll('.main-tab-btn').map((b) => b.text())

/** A booking by `teacherUsername` given by `lecturerId` */
function book(teacherUsername: string, lecturerId: string, proposedAt: string) {
  return useBookingsStore().createSession({
    courseId: 'bible-01',
    courseTitle: '聖經時觀',
    lecturerId,
    lecturerName: '王講師',
    lecturerTitle: '牧師',
    teacherUsername,
    proposedAt,
    durationMinutes: 90,
    prep: { scriptures: [], readingNotes: '', materials: '' },
    studentUsernames: ['student'],
    church: CHURCH
  })
}

describe('TeacherDashboard', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('gives a teacher the care, settings and bookings tabs', async () => {
    const { wrapper } = await mountAs('teacher')
    expect(tabTexts(wrapper)).toEqual([
      `👨‍🏫 ${t('teacher.tabs.careTeacher')}`,
      `⚙️ ${t('teacher.tabs.settings')}`,
      `📅 ${t('teacher.tabs.bookings')}`
    ])
    expect(wrapper.find('.page-title').text()).toBe(t('teacher.header.teacherTitle'))
  })

  it('gives a pastor the church overview instead of bookings', async () => {
    const { wrapper } = await mountAs('pastor')
    expect(tabTexts(wrapper)).toEqual([
      `⛪ ${t('teacher.tabs.carePastor')}`,
      `⛪ ${t('teacher.tabs.pastorOverview')}`,
      `⚙️ ${t('teacher.tabs.settings')}`
    ])
    expect(wrapper.find('.page-title').text()).toBe(t('teacher.header.pastorTitle'))

    await wrapper.findAll('.main-tab-btn')[1].trigger('click')
    await rendered(wrapper, '.church-bookings-panel')
  })

  it('shows a parent no tabs, only their children', async () => {
    const { wrapper } = await mountAs('parent')
    expect(wrapper.find('.main-tabs').exists()).toBe(false)
    expect(wrapper.findAll('.stat-val')[0].text()).toBe('1') // the bound child
  })

  it('counts visible students, the ones in my care and the notes they wrote', async () => {
    const { wrapper } = await mountAs('teacher', () => {
      const auth = useAuthStore()
      auth.usersDb.s2 = { passwordHash: 'x', role: 'student', church: CHURCH, gender: 'male' }
      auth.usersDb.girl = { passwordHash: 'x', role: 'student', church: CHURCH, gender: 'female' }
      const courses = useCoursesStore()
      courses.assignStudentCaretaker('s2', 'teacher', 'teacher')
      const listen = (notes: string) => ({
        lecturer: '張牧師 牧師',
        listenedAt: '2025-01-01T10:00',
        notes
      })
      courses.addListenSession('student', 'bible-01', listen('很有收穫'))
      courses.addListenSession('student', 'bible-02', listen(''))
    })
    const stats = wrapper.findAll('.stat-val').map((s) => s.text())
    // student and s2 (the girl is hidden from a male teacher); s2 is in my care; one note
    expect(stats).toEqual(['2', '1', '1'])
  })

  it('tells a teacher without a gender why they see no students', async () => {
    const { wrapper } = await mountAs('teacher', () => {
      delete useAuthStore().usersDb.teacher.gender
    })
    expect(wrapper.find('.gender-unset-banner').text()).toContain(t('gender.teacherUnsetNotice'))
    expect(wrapper.findAll('.stat-val')[0].text()).toBe('0')
  })

  it('marks pending bookings on the bookings tab', async () => {
    const { wrapper } = await mountAs('teacher', () => {
      book('teacher', 'l1', '2099-01-01T10:00')
      const confirmed = book('teacher', 'l1', '2099-02-01T10:00')
      useBookingsStore().updateSessionStatus(confirmed.id, 'confirmed')
      book('pastor', 'l1', '2099-03-01T10:00') // someone else's
    })
    expect(wrapper.find('#tab-bookings .tab-badge').text()).toBe('1')
  })

  it('opens My Lectures for a linked lecturer and counts lectures left to record', async () => {
    const { wrapper } = await mountAs('pastor', () => {
      const courses = useCoursesStore()
      courses.addLecturer('王牧師', '牧師', [], CHURCH, 'pastor')
      const lecturerId = courses.lecturers.at(-1)!.id
      const past = book('teacher', lecturerId, '2020-01-01T10:00')
      useBookingsStore().updateSessionStatus(past.id, 'confirmed', {
        confirmedAt: past.proposedAt
      })
    })
    const tab = wrapper.find('#tab-lectures')
    expect(tab.find('.tab-badge').text()).toBe('1')
    expect(tab.text()).toContain(t('teacher.lecture.tabBadge', { n: 1 }))

    await tab.trigger('click')
    await rendered(wrapper, '.lecture-schedule .lecture-card')
  })

  it('takes a student into and out of my care from the list', async () => {
    const { wrapper } = await mountAs('teacher')
    const courses = useCoursesStore()
    const list = wrapper.findComponent({ name: 'TeacherStudentList' })
    list.vm.$emit('manage-student', 'student')
    expect(courses.getStudentCaretaker('student', 'teacher')).toBe('teacher')
    list.vm.$emit('unmanage-student', 'student')
    expect(courses.getStudentCaretaker('student', 'teacher')).toBe('')
  })
})
