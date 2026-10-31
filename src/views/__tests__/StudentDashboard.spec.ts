import { describe, it, expect, afterEach, vi } from 'vitest'
import { DOMWrapper } from '@vue/test-utils'
import StudentDashboard from '@/views/StudentDashboard.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import { mountPrepared, toastTexts, t } from '@/__tests__/helpers'

const CHURCH = '愛與話語'

/** Sign in as the demo student, run `seed`, then mount the dashboard */
async function mountStudent(seed: () => void = () => {}) {
  const result = mountPrepared(
    StudentDashboard,
    () => {
      useAuthStore().currentUser = {
        username: 'student',
        role: 'student',
        loginMethod: 'credentials',
        church: CHURCH,
        displayName: '小明'
      }
      seed()
    },
    { attachTo: document.body }
  )
  // The tab contents are loaded on demand
  await rendered(result.wrapper, '.course-card')
  return result
}

type Wrapper = Awaited<ReturnType<typeof mountStudent>>['wrapper']

const rendered = (wrapper: Wrapper, selector: string) =>
  vi.waitFor(() => expect(wrapper.find(selector).exists()).toBe(true))

const listen = { lecturer: '張牧師 牧師', listenedAt: '2025-01-01T10:00', notes: '' }

function book(proposedAt: string) {
  return useBookingsStore().createSession({
    courseId: 'bible-01',
    courseTitle: '聖經時觀',
    lecturerId: 'l1',
    lecturerName: '王講師',
    lecturerTitle: '牧師',
    teacherUsername: 'teacher',
    proposedAt,
    durationMinutes: 90,
    prep: { scriptures: [], readingNotes: '', materials: '' },
    studentUsernames: ['student'],
    church: CHURCH
  })
}

describe('StudentDashboard', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('greets the student and names everyone caring for them', async () => {
    const { wrapper } = await mountStudent(() => {
      const courses = useCoursesStore()
      courses.assignStudentCaretaker('student', 'teacher', 'teacher')
      courses.assignStudentCaretaker('student', 'pastor', 'pastor')
      useAuthStore().usersDb.mom = {
        passwordHash: 'x',
        role: 'parent',
        church: CHURCH,
        childUsernames: ['student']
      }
    })
    expect(wrapper.find('.page-title').text()).toBe(t('student.header.hello', { name: '小明' }))
    const labels = wrapper.findAll('.assigned-teacher-label').map((l) => l.text())
    expect(labels).toEqual([
      `🛡️ ${t('student.header.teacher')}teacher`,
      `⛪ ${t('student.header.pastor')}pastor`,
      `👨‍👩‍👦 ${t('student.header.parent')}parent、mom`
    ])
    expect(wrapper.find('.no-teacher-hint').exists()).toBe(false)
  })

  it('says when nobody is caring for them yet', async () => {
    const { wrapper } = await mountStudent(() => {
      useAuthStore().unbindChild('parent', 'student')
    })
    expect(wrapper.findAll('.assigned-teacher-label')).toHaveLength(0)
    expect(wrapper.find('.no-teacher-hint').text()).toBe(t('student.header.noCaretaker'))
  })

  it('sums up progress and encourages accordingly', async () => {
    const { wrapper } = await mountStudent()
    const courses = useCoursesStore()
    const total = courses.courses.length
    const nums = () => wrapper.findAll('.summary-num').map((n) => n.text())
    expect(nums().slice(0, 2)).toEqual([`0/${total}`, '0%'])
    expect(wrapper.find('.motivation-text').text()).toBe(t('student.motivation.start'))

    courses.courses.forEach((c) => courses.addListenSession('student', c.id, listen))
    await wrapper.vm.$nextTick()
    expect(nums().slice(0, 2)).toEqual([`${total}/${total}`, '100%'])
    expect(wrapper.find('.motivation-text').text()).toBe(t('student.motivation.done'))
  })

  it('switches tabs and shows how many bookings are coming up', async () => {
    const { wrapper } = await mountStudent(() => {
      book('2099-01-01T10:00')
      book('2099-02-01T10:00')
      book('2020-01-01T10:00') // already past
    })
    const tab = (id: string) => wrapper.find(`#${id}`)
    expect(tab('tab-my-bookings').find('.booking-badge').text()).toBe('2')
    expect(tab('tab-sermons').attributes('aria-selected')).toBe('true')

    await tab('tab-my-bookings').trigger('click')
    expect(tab('tab-my-bookings').attributes('aria-selected')).toBe('true')
    expect(tab('tab-sermons').attributes('aria-selected')).toBe('false')
    await rendered(wrapper, '#tabpanel-bookings')
    expect(wrapper.find('#tabpanel-sermons').exists()).toBe(false)

    await tab('tab-shining').trigger('click')
    await rendered(wrapper, '#tabpanel-shining')
  })

  it('saves feedback written for a finished booking', async () => {
    let session!: ReturnType<typeof book>
    const { wrapper } = await mountStudent(() => {
      session = book('2020-01-01T10:00')
      useBookingsStore().completeSession(session.id, '')
    })
    await wrapper.find('#tab-my-bookings').trigger('click')
    await rendered(wrapper, `#btn-feedback-${session.id}`)
    await wrapper.find(`#btn-feedback-${session.id}`).trigger('click')

    const body = new DOMWrapper(document.body)
    await vi.waitFor(() => expect(body.find('#student-feedback-textarea').exists()).toBe(true))
    await body.find('#student-feedback-textarea').setValue('收穫很多')
    await body.find('#btn-submit-student-feedback').trigger('click')

    const bookings = useBookingsStore()
    expect(bookings.getAttendeesForSession(session.id)[0].studentFeedback).toBe('收穫很多')
    expect(toastTexts().at(-1)).toBe(t('student.feedbackSaved'))
  })
})
