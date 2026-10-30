import { describe, it, expect, afterEach } from 'vitest'
import { DOMWrapper } from '@vue/test-utils'
import TeacherNotesDialog, {
  type StudentProgressSummary,
  type StudentRecordDetail
} from '@/components/teacher/TeacherNotesDialog.vue'
import { mountWith, t } from '@/__tests__/helpers'

const $ = (sel: string) => new DOMWrapper(document.body).find(sel)
const $$ = (sel: string) => new DOMWrapper(document.body).findAll(sel)

const record = (courseId: string, completed: boolean, notes = ''): StudentRecordDetail => ({
  courseId,
  courseTitle: `課程 ${courseId}`,
  listenedTime: 0,
  totalDuration: 180,
  percent: completed ? 100 : 0,
  completed,
  notes,
  lastUpdated: completed ? '2026-10-01T02:00:00.000Z' : ''
})

const student: StudentProgressSummary = {
  username: 'student',
  realName: '小明',
  avatarUrl: 'https://example.com/a.png',
  completedCount: 2,
  totalProgressPercent: 50,
  lastActive: '2026-10-01T02:00:00.000Z',
  records: [
    record('c1', true, '很有收穫'),
    record('c2', true),
    record('c3', false),
    record('c4', false)
  ]
}

function open(
  props: Partial<{ canSendFeedback: boolean; student: StudentProgressSummary | null }> = {}
) {
  return mountWith(TeacherNotesDialog, {
    props: { modelValue: true, student, totalCourses: 4, canSendFeedback: true, ...props },
    attachTo: document.body
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('TeacherNotesDialog', () => {
  it('filters the records', async () => {
    const { wrapper } = open()
    const titles = () => $$('.notes-record-title').map((h) => h.text())
    const filter = (i: number) => $$('.filter-btns button')[i].trigger('click')
    expect(titles()).toHaveLength(4)

    await filter(1) // completed
    expect(titles()).toEqual(['課程 c1', '課程 c2'])
    expect($$('.filter-btns button')[1].text()).toContain(t('teacher.drawer.completed'))
    await filter(2) // not completed
    expect(titles()).toEqual(['課程 c3', '課程 c4'])
    await filter(3) // with notes
    expect(titles()).toEqual(['課程 c1'])
    wrapper.unmount()
  })

  it('sends feedback on a note, shows it and clears the field', async () => {
    const { wrapper } = open()
    const input = $('.notes-feedback-area input')
    const send = $('.notes-feedback-area .btn-primary')

    await send.trigger('click') // empty: nothing happens
    expect(wrapper.emitted('feedback-sent')).toBeUndefined()

    await input.setValue('  寫得很好  ')
    await send.trigger('click')
    expect(wrapper.emitted('feedback-sent')).toEqual([['student', 'c1', '寫得很好']])
    expect($('.feedback-sent-msg').text()).toContain('寫得很好')
    expect((input.element as HTMLInputElement).value).toBe('')
    wrapper.unmount()
  })

  it('hides the feedback field from viewers who cannot send feedback', () => {
    const { wrapper } = open({ canSendFeedback: false })
    expect($('.notes-text-box').exists()).toBe(true)
    expect($('.notes-feedback-area').exists()).toBe(false)
    wrapper.unmount()
  })

  it('closes from the close button and from Escape', async () => {
    const { wrapper } = open()
    await $('.notes-close-btn').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [false]])
    wrapper.unmount()
  })

  it('renders nothing without a student', () => {
    const { wrapper } = open({ student: null })
    expect($('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
