import { describe, it, expect, afterEach } from 'vitest'
import { DOMWrapper } from '@vue/test-utils'
import TeacherLecturerModal from '@/components/teacher/TeacherLecturerModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore, type Lecturer } from '@/stores/courses'
import { mountWith, toastTexts, t } from '@/__tests__/helpers'

const CHURCH = '愛與話語'

// The modal is teleported to <body>
const body = () => new DOMWrapper(document.body)
const $ = (sel: string) => body().find(sel)

function open(lecturer: Lecturer | null = null) {
  return mountWith(TeacherLecturerModal, {
    props: { modelValue: true, lecturer, church: CHURCH },
    attachTo: document.body
  })
}

describe('TeacherLecturerModal', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('requires a name', async () => {
    const { wrapper } = open()
    const before = useCoursesStore().lecturers.length
    await $('#btn-save-lecturer').trigger('click')
    expect(toastTexts()).toEqual([t('teacher.lecturer.nameRequired')])
    expect(useCoursesStore().lecturers).toHaveLength(before)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('adds a lecturer with the selected courses and closes', async () => {
    const { wrapper } = open()
    const courses = useCoursesStore()
    await $('#input-lecturer-name').setValue('測試講師')
    await $('.courses-checkboxes-grid input').setValue(true)
    await $('#btn-save-lecturer').trigger('click')

    const added = courses.lecturers.find((l) => l.name === '測試講師')
    expect(added).toMatchObject({ church: CHURCH, courseIds: [courses.courses[0].id] })
    expect(added?.linkedUsername).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(toastTexts()).toEqual([t('teacher.lecturer.savedToast')])
    wrapper.unmount()
  })

  it('links a teacher account and fills the name from it', async () => {
    const { wrapper } = open()
    const auth = useAuthStore()
    auth.usersDb.t2 = { passwordHash: 'x', role: 'teacher', church: CHURCH, realName: '王老師' }
    await $('#btn-link-mode').trigger('click')
    await $('#select-linked-teacher').setValue('t2')
    expect(($('#input-lecturer-name').element as HTMLInputElement).value).toBe('王老師')

    await $('#btn-save-lecturer').trigger('click')
    expect(useCoursesStore().lecturers.find((l) => l.name === '王老師')?.linkedUsername).toBe('t2')
    wrapper.unmount()
  })

  it('prefills an existing lecturer when opened and saves the changes', async () => {
    const { wrapper } = mountWith(TeacherLecturerModal, {
      props: { modelValue: false, lecturer: null, church: CHURCH },
      attachTo: document.body
    })
    const courses = useCoursesStore()
    courses.addLecturer('舊名字', '牧師', [], CHURCH)
    const lec = courses.lecturers.find((l) => l.name === '舊名字')!

    await wrapper.setProps({ modelValue: true, lecturer: lec })
    expect(($('#input-lecturer-name').element as HTMLInputElement).value).toBe('舊名字')
    expect(($('#select-lecturer-title').element as HTMLSelectElement).value).toBe('牧師')

    await $('#input-lecturer-name').setValue('新名字')
    await $('#btn-save-lecturer').trigger('click')
    expect(courses.lecturers.find((l) => l.id === lec.id)?.name).toBe('新名字')
    wrapper.unmount()
  })
})
