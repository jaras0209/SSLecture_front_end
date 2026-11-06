import { describe, it, expect, afterEach, vi } from 'vitest'
import { DOMWrapper } from '@vue/test-utils'
import StudentDashboard from '@/views/StudentDashboard.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import { mountPrepared, toastTexts, t } from '@/__tests__/helpers'
import { setLocale } from '@/i18n'

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

  it('names the caretakers as the student knows them, not by username', async () => {
    const { wrapper } = await mountStudent(() => {
      const auth = useAuthStore()
      auth.usersDb.teacher.realName = '王老師'
      auth.usersDb.pastor.displayName = '李牧師'
      auth.usersDb.mom = {
        passwordHash: 'x',
        role: 'parent',
        church: CHURCH,
        realName: '陳媽媽',
        childUsernames: ['student']
      }
      const courses = useCoursesStore()
      courses.assignStudentCaretaker('student', 'teacher', 'teacher')
      courses.assignStudentCaretaker('student', 'pastor', 'pastor')
    })
    const names = wrapper.findAll('.assigned-teacher-label strong').map((n) => n.text())
    expect(names).toEqual(['王老師', '李牧師', 'parent、陳媽媽'])
  })

  it('lists several parents the way the interface language does', async () => {
    const { wrapper } = await mountStudent(() => {
      useAuthStore().usersDb.mom = {
        passwordHash: 'x',
        role: 'parent',
        church: CHURCH,
        childUsernames: ['student']
      }
    })
    const parents = () => wrapper.findAll('.assigned-teacher-label strong').at(-1)!.text()
    expect(parents()).toBe('parent、mom')
    await setLocale('en')
    await wrapper.vm.$nextTick()
    expect(parents()).toBe('parent and mom')
    await setLocale('zh-TW')
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

  it("shows caretakers' replies on the course, newest first", async () => {
    const { wrapper } = await mountStudent(() => {
      const courses = useCoursesStore()
      const course = courses.courses[0]
      courses.addListenSession('student', course.id, { ...listen, notes: '我的心得' })
      useAuthStore().usersDb.teacher.realName = '王老師'
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      courses.addFeedback('student', course.id, 'teacher', '寫得很好')
      vi.setSystemTime(new Date('2026-01-02T00:00:00Z'))
      courses.addFeedback('student', course.id, 'pastor', '繼續加油')
      vi.useRealTimers()
    })
    await wrapper.find('.course-card').trigger('click')
    await rendered(wrapper, '.course-feedback')
    const items = wrapper.findAll('.course-feedback-item').map((i) => i.text())
    expect(items).toHaveLength(2)
    expect(items[0]).toContain('繼續加油')
    expect(items[1]).toContain('王老師')
    expect(items[1]).toContain('寫得很好')
  })

  it('marks courses with new replies until the student opens them', async () => {
    let courseId = ''
    const { wrapper } = await mountStudent(() => {
      const courses = useCoursesStore()
      courseId = courses.courses[0].id
      courses.addListenSession('student', courseId, { ...listen, notes: '我的心得' })
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      courses.addFeedback('student', courseId, 'teacher', '第一則')
      courses.markFeedbackSeen('student', courseId) // already read
      vi.setSystemTime(new Date('2026-01-02T00:00:00Z'))
      courses.addFeedback('student', courseId, 'teacher', '第二則')
      vi.useRealTimers()
    })
    const tab = wrapper.find('#tab-sermons')
    expect(tab.find('.booking-badge').text()).toBe('1')
    expect(tab.text()).toContain(t('student.course.coursesWithNewReplies', { n: 1 }))
    const card = wrapper.find('.course-card')
    expect(card.find('.badge-new-reply').text()).toContain(t('student.course.newReplies', { n: 1 }))

    await card.trigger('click')
    await rendered(wrapper, '.course-feedback')
    // only the reply that was new when the course was opened is marked
    const items = wrapper.findAll('.course-feedback-item')
    expect(items[0].text()).toContain('第二則')
    expect(items[0].find('.course-feedback-new').exists()).toBe(true)
    expect(items[1].find('.course-feedback-new').exists()).toBe(false)
    // ...and opening it counts as seeing it
    expect(useCoursesStore().unreadFeedback('student', courseId)).toEqual([])
    expect(wrapper.find('#tab-sermons .booking-badge').exists()).toBe(false)
    expect(wrapper.find('.badge-new-reply').exists()).toBe(false)

    // a reply arriving while the course is open is new too, and the earlier mark stays
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-03T00:00:00Z'))
    useCoursesStore().addFeedback('student', courseId, 'teacher', '第三則')
    vi.useRealTimers()
    await wrapper.vm.$nextTick()
    const marks = wrapper
      .findAll('.course-feedback-item')
      .map((i) => i.find('.course-feedback-new').exists())
    expect(marks).toEqual([true, true, false])
    expect(useCoursesStore().unreadFeedback('student', courseId)).toEqual([])
  })
})
