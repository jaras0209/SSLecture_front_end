import { describe, it, expect, afterEach } from 'vitest'
import { DOMWrapper } from '@vue/test-utils'
import TeacherLecturerModal from '@/components/teacher/TeacherLecturerModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore, type Lecturer } from '@/stores/courses'
import { mountWith, mountPrepared, toastTexts, t } from '@/__tests__/helpers'
import { LECTURER_TITLES } from '@/utils/lecturerTitle'

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

  it('requires a name, and says so next to the form', async () => {
    const { wrapper } = open()
    const before = useCoursesStore().lecturers.length
    await $('#input-lecturer-name').setValue('   ')
    await $('#btn-save-lecturer').trigger('click')
    expect($('[role="dialog"] [role="alert"]').text()).toBe(
      t('stores.courses.lecturerNameRequired')
    )
    expect(useCoursesStore().lecturers).toHaveLength(before)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it("won't list the same lecturer twice in a church, and keeps the form", async () => {
    const { wrapper } = open()
    const courses = useCoursesStore()
    courses.addLecturer('王講師', 'pastor', [], CHURCH)
    const before = courses.lecturers.length
    await $('#input-lecturer-name').setValue(' 王講師 ')
    await $('#select-lecturer-title').setValue('pastor')
    await $('#btn-save-lecturer').trigger('click')
    expect($('[role="dialog"] [role="alert"]').text()).toBe(
      t('stores.courses.lecturerExists', { name: '王講師' })
    )
    expect(courses.lecturers).toHaveLength(before)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    // the same name with another title is someone else
    await $('#select-lecturer-title').setValue('preacher')
    await $('#btn-save-lecturer').trigger('click')
    expect(courses.lecturers).toHaveLength(before + 1)
    expect(courses.lecturers.at(-1)!.name).toBe('王講師') // trimmed
    wrapper.unmount()
  })

  it('offers an account only if no other lecturer is linked to it', async () => {
    let own!: Lecturer
    const seed = () => {
      useAuthStore().usersDb.t2 = {
        passwordHash: 'x',
        role: 'teacher',
        church: CHURCH,
        realName: '王老師'
      }
      useCoursesStore().addLecturer('王老師', 'lecturer', [], CHURCH, 't2')
      own = useCoursesStore().lecturers.find((l) => l.linkedUsername === 't2')!
    }
    const adding = mountPrepared(TeacherLecturerModal, seed, {
      props: { modelValue: true, lecturer: null, church: CHURCH },
      attachTo: document.body
    })
    await $('#btn-link-mode').trigger('click')
    const option = $('#select-linked-teacher option[value="t2"]')
    expect(option.attributes('disabled')).toBeDefined()
    expect(option.text()).toContain(t('teacher.lecturer.alreadyLinked', { name: '王老師' }))
    // and the store refuses too
    expect(useCoursesStore().addLecturer('別名', 'lecturer', [], CHURCH, 't2').message).toBe(
      t('stores.courses.lecturerAccountLinked', { username: 't2', name: '王老師' })
    )
    adding.wrapper.unmount()

    // editing that lecturer keeps its own account available
    const editing = mountPrepared(TeacherLecturerModal, seed, {
      props: { modelValue: true, lecturer: null, church: CHURCH },
      attachTo: document.body
    })
    await editing.wrapper.setProps({ lecturer: own }) // the one this mount's seed created
    await $('#btn-link-mode').trigger('click')
    expect($('#select-linked-teacher option[value="t2"]').attributes('disabled')).toBeUndefined()
    editing.wrapper.unmount()
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

  it('offers the church’s teachers and then its pastors, with their roles', async () => {
    const { wrapper } = open()
    const auth = useAuthStore()
    auth.usersDb.p2 = { passwordHash: 'x', role: 'pastor', church: CHURCH, realName: '王牧師' }
    auth.usersDb.s9 = { passwordHash: 'x', role: 'student', church: CHURCH }
    await $('#btn-link-mode').trigger('click')
    const options = body()
      .findAll('#select-linked-teacher option')
      .map((o) => o.attributes('value'))
      .filter(Boolean)
    expect(options.at(-1)).toBe('p2')
    expect(options).toContain('teacher')
    expect(options).not.toContain('s9')
    expect(options.indexOf('teacher')).toBeLessThan(options.indexOf('p2'))
    expect($('#select-linked-teacher option[value="p2"]').text()).toContain(t('roleLabel.pastor'))
    wrapper.unmount()
  })

  it('prefills an existing lecturer when opened and saves the changes', async () => {
    const { wrapper } = mountWith(TeacherLecturerModal, {
      props: { modelValue: false, lecturer: null, church: CHURCH },
      attachTo: document.body
    })
    const courses = useCoursesStore()
    courses.addLecturer('舊名字', 'pastor', [], CHURCH)
    const lec = courses.lecturers.find((l) => l.name === '舊名字')!

    await wrapper.setProps({ modelValue: true, lecturer: lec })
    expect(($('#input-lecturer-name').element as HTMLInputElement).value).toBe('舊名字')
    const title = $('#select-lecturer-title').element as HTMLSelectElement
    expect(title.value).toBe('pastor')
    expect(title.selectedOptions[0].text.trim()).toBe(t('teacher.lecturer.titleOptions.pastor'))

    await $('#input-lecturer-name').setValue('新名字')
    await $('#btn-save-lecturer').trigger('click')
    expect(courses.lecturers.find((l) => l.id === lec.id)?.name).toBe('新名字')
    wrapper.unmount()
  })

  it('keeps a hand-written title from older data selectable', async () => {
    const { wrapper } = mountWith(TeacherLecturerModal, {
      props: { modelValue: false, lecturer: null, church: CHURCH },
      attachTo: document.body
    })
    const courses = useCoursesStore()
    courses.addLecturer('客座', '執事', [], CHURCH)
    const lec = courses.lecturers.find((l) => l.name === '客座')!
    expect(lec.title).toBe('執事')

    await wrapper.setProps({ modelValue: true, lecturer: lec })
    const title = $('#select-lecturer-title').element as HTMLSelectElement
    expect(title.value).toBe('執事')
    const codes = [...title.options].map((o) => o.value)
    expect(codes).toEqual(['執事', ...LECTURER_TITLES])
    wrapper.unmount()
  })
})
