import { describe, it, expect, afterEach } from 'vitest'
import StudentCourseDetail from '@/components/student/StudentCourseDetail.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore, type Course } from '@/stores/courses'
import { setLocale } from '@/i18n'
import { mountPrepared, toastTexts, t } from '@/__tests__/helpers'

const CHURCH = '愛與話語'

/** Sign in as the demo student, run `seed`, then show `courseId` (the first course by default) */
function mountDetail(seed: () => void = () => {}, courseId?: string) {
  let course!: Course
  const result = mountPrepared(
    StudentCourseDetail,
    () => {
      useAuthStore().currentUser = {
        username: 'student',
        role: 'student',
        loginMethod: 'credentials',
        church: CHURCH
      }
      seed()
      const courses = useCoursesStore().courses
      course = courseId ? courses.find((c) => c.id === courseId)! : courses[0]
    },
    { props: { selectedCourse: null as Course | null } }
  )
  return { ...result, course }
}

type Wrapper = ReturnType<typeof mountDetail>['wrapper']

const open = async (wrapper: Wrapper, course: Course | null) => {
  await wrapper.setProps({ selectedCourse: course })
}
const options = (wrapper: Wrapper, id: string) =>
  wrapper.findAll(`#${id} option`).map((o) => [o.attributes('value'), o.text()])
const sessions = (course: Course) =>
  useCoursesStore().getStudentProgress('student', course.id).sessions

const listen = { lecturer: '張牧師 牧師', listenedAt: '2026-03-01T19:30', notes: '第一次' }

describe('StudentCourseDetail', () => {
  afterEach(async () => {
    await setLocale('zh-TW')
  })

  it('invites picking a course until one is chosen', () => {
    const { wrapper } = mountDetail()
    expect(wrapper.find('.empty-player-state').exists()).toBe(true)
    expect(wrapper.find('#lecturer-select').exists()).toBe(false)
  })

  it('records the first listen, then empties the form and says it was saved', async () => {
    const { wrapper, course } = mountDetail()
    await open(wrapper, course)
    await wrapper.find('#lecturer-select').setValue('張牧師 牧師')
    await wrapper.find('#listened-time-input').setValue('2026-03-01T19:30')
    await wrapper.find('#notes-input').setValue('很受感動')
    await wrapper.find('.save-row button').trigger('click')

    expect(sessions(course)).toMatchObject([
      { lecturer: '張牧師 牧師', listenedAt: '2026-03-01T19:30', notes: '很受感動' }
    ])
    expect(useCoursesStore().getStudentProgress('student', course.id).completed).toBe(true)
    // now shown as a record, with a fresh form behind the "record another" toggle
    expect(wrapper.findAll('.timeline-item')).toHaveLength(1)
    expect(toastTexts().at(-1)).toBe(t('student.course.recorded'))
    await wrapper.find('.btn-review-toggle').trigger('click')
    expect(wrapper.find<HTMLTextAreaElement>('#review-notes-input').element.value).toBe('')
  })

  it("offers the church's lecturers of this course, with their titles in the current language", async () => {
    const { wrapper, course } = mountDetail()
    await open(wrapper, course)
    expect(options(wrapper, 'lecturer-select')).toEqual([
      ['', t('student.course.selectLecturer')],
      ['張牧師 牧師', '張牧師 (牧師)']
    ])

    await setLocale('en')
    await wrapper.vm.$nextTick()
    expect(options(wrapper, 'lecturer-select')[1]).toEqual(['張牧師 Pastor', '張牧師 (Pastor)'])
  })

  it('offers every lecturer of the church when none teaches the course', async () => {
    const { wrapper, course } = mountDetail(() => {
      const courses = useCoursesStore()
      courses.lecturers.forEach((l) => (l.courseIds = []))
    })
    await open(wrapper, course)
    const names = options(wrapper, 'lecturer-select').map(([, label]) => label)
    expect(names.slice(1)).toEqual(['張牧師 (牧師)', '陳傳道 (傳道人)', '林輔導 (輔導)'])
  })

  it('lists the records newest first and records another', async () => {
    const { wrapper, course } = mountDetail(() => {
      const courses = useCoursesStore()
      courses.addListenSession('student', courses.courses[0].id, listen)
      courses.addListenSession('student', courses.courses[0].id, {
        ...listen,
        listenedAt: '2026-04-01T19:30',
        notes: '第二次'
      })
    })
    await open(wrapper, course)
    const items = wrapper.findAll('.timeline-item')
    expect(items.map((i) => i.find('.timeline-notes').text())).toEqual(['第二次', '第一次'])
    expect(items[0].find('.timeline-count').text()).toBe(t('student.course.sessionNo', { n: 2 }))

    await wrapper.find('.btn-review-toggle').trigger('click')
    await wrapper.find('#review-notes-input').setValue('第三次')
    await wrapper.find('.review-form .save-row button').trigger('click')
    expect(sessions(course).map((s) => s.notes)).toEqual(['第一次', '第二次', '第三次'])
    expect(wrapper.find('.review-form').exists()).toBe(false) // closed again
    expect(toastTexts().at(-1)).toBe(t('student.course.recorded'))
  })

  it('shows a saved lecturer title in the current language', async () => {
    const { wrapper, course } = mountDetail(() => {
      const courses = useCoursesStore()
      courses.addListenSession('student', courses.courses[0].id, listen)
    })
    await open(wrapper, course)
    await setLocale('en')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.timeline-lecturer').text()).toBe('🎤 張牧師 Pastor')
  })

  it('edits a record in place, or leaves it as it was on cancel', async () => {
    const { wrapper, course } = mountDetail(() => {
      const courses = useCoursesStore()
      courses.addListenSession('student', courses.courses[0].id, listen)
    })
    await open(wrapper, course)
    const startEdit = () => wrapper.find('.timeline-actions button').trigger('click')

    await startEdit()
    expect(wrapper.find<HTMLSelectElement>('#edit-session-lecturer').element.value).toBe(
      '張牧師 牧師'
    )
    await wrapper.find('#edit-session-notes').setValue('不要存')
    await wrapper.find('.edit-session-actions .btn-ghost').trigger('click')
    expect(sessions(course)[0].notes).toBe('第一次')
    expect(wrapper.find('.timeline-notes').text()).toBe('第一次')

    await startEdit()
    await wrapper.find('#edit-session-notes').setValue('補充心得')
    await wrapper.find('#edit-session-time').setValue('2026-03-02T08:00')
    await wrapper.find('.edit-session-actions .btn-primary').trigger('click')
    expect(sessions(course)[0]).toMatchObject({
      notes: '補充心得',
      listenedAt: '2026-03-02T08:00',
      lecturer: '張牧師 牧師'
    })
    expect(wrapper.find('#edit-session-notes').exists()).toBe(false)
  })

  it('keeps a lecturer recorded in the other language when editing', async () => {
    const { wrapper, course } = mountDetail(() => {
      const courses = useCoursesStore()
      courses.addListenSession('student', courses.courses[0].id, listen)
    })
    await open(wrapper, course)
    await setLocale('en')
    await wrapper.find('.timeline-actions button').trigger('click')
    const select = wrapper.find<HTMLSelectElement>('#edit-session-lecturer')
    expect(select.element.value).toBe('張牧師 牧師')
    expect(select.element.selectedOptions[0].text.trim()).toBe('張牧師 Pastor')
    await wrapper.find('.edit-session-actions .btn-primary').trigger('click')
    expect(sessions(course)[0].lecturer).toBe('張牧師 牧師')
  })

  it('starts afresh when another course is chosen', async () => {
    const { wrapper, course } = mountDetail(() => {
      const courses = useCoursesStore()
      courses.addListenSession('student', courses.courses[0].id, listen)
    })
    await open(wrapper, course)
    await wrapper.find('.timeline-actions button').trigger('click')
    await wrapper.find('.btn-review-toggle').trigger('click')

    await open(wrapper, useCoursesStore().courses[1])
    expect(wrapper.find('#lecturer-select').exists()).toBe(true) // nothing recorded yet
    expect(wrapper.find<HTMLTextAreaElement>('#notes-input').element.value).toBe('')

    await open(wrapper, course)
    expect(wrapper.find('#edit-session-notes').exists()).toBe(false)
    expect(wrapper.find('.review-form').exists()).toBe(false)
  })
})
