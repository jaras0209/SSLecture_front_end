import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import TeacherSettingsPanel from '@/components/teacher/TeacherSettingsPanel.vue'
import { useCoursesStore } from '@/stores/courses'
import { resolveConfirm } from '@/composables/useToast'
import { mountWith, t } from '@/__tests__/helpers'

const CHURCH = '愛與話語'
const OTHER = '主大明'
/** A church with no themes yet (the demo church comes with some) */
const EMPTY = '主勝利'

function mountPanel(isAdmin = false, church = CHURCH) {
  const result = mountWith(TeacherSettingsPanel, {
    props: {
      isAdmin,
      church,
      'onUpdate:church': (c: string) => result.wrapper.setProps({ church: c })
    }
  })
  return { ...result, courses: useCoursesStore() }
}

type Wrapper = ReturnType<typeof mountPanel>['wrapper']

/** The character (0) or coming-of-age (1) theme block */
const block = (wrapper: Wrapper, i: 0 | 1) => wrapper.findAll('.theme-manage-block')[i]
const themes = (wrapper: Wrapper, i: 0 | 1) =>
  block(wrapper, i)
    .findAll('.theme-item > span')
    .map((s) => s.text().replace('✦ ', ''))
const button = (wrapper: Wrapper, text: string) =>
  wrapper.findAll('button').filter((b) => b.text().includes(text))

describe('TeacherSettingsPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("adds a church's themes from the button or Enter, ignoring blanks", async () => {
    const { wrapper, courses } = mountPanel(false, EMPTY)
    const input = block(wrapper, 0).find('input')
    expect(input.attributes('aria-label')).toBe(t('teacher.settings.characterThemesTitle'))

    await input.setValue('  誠實  ')
    await block(wrapper, 0).find('.add-theme-row button').trigger('click')
    await input.setValue('勇氣')
    await input.trigger('keydown', { key: 'Enter' })
    await input.setValue('   ')
    await input.trigger('keydown', { key: 'Enter' })

    expect(themes(wrapper, 0)).toEqual(['誠實', '勇氣'])
    expect((input.element as HTMLInputElement).value).toBe('   ')
    expect(courses.getThemesByChurch('character', EMPTY)).toEqual(['誠實', '勇氣'])
    expect(courses.getThemesByChurch('character', CHURCH)).not.toContain('誠實')

    const other = block(wrapper, 1).find('input')
    await other.setValue('獨立')
    await other.trigger('keydown', { key: 'Enter' })
    expect(themes(wrapper, 1)).toEqual(['獨立'])
  })

  it('renames a theme, but not onto another existing one', async () => {
    const { wrapper, courses } = mountPanel(false, EMPTY)
    courses.addTheme('character', '誠實', EMPTY)
    courses.addTheme('character', '勇氣', EMPTY)
    await wrapper.vm.$nextTick()

    vi.stubGlobal(
      'prompt',
      vi.fn(() => ' 正直 ')
    )
    await button(wrapper, t('teacher.settings.rename'))[0].trigger('click')
    expect(themes(wrapper, 0)).toEqual(['正直', '勇氣'])

    vi.stubGlobal(
      'prompt',
      vi.fn(() => '勇氣')
    )
    await button(wrapper, t('teacher.settings.rename'))[0].trigger('click')
    expect(themes(wrapper, 0)).toEqual(['正直', '勇氣'])

    vi.stubGlobal(
      'prompt',
      vi.fn(() => null)
    ) // cancelled
    await button(wrapper, t('teacher.settings.rename'))[0].trigger('click')
    expect(themes(wrapper, 0)).toEqual(['正直', '勇氣'])
  })

  it('deletes a theme or lecturer only once confirmed', async () => {
    const { wrapper, courses } = mountPanel(false, EMPTY)
    courses.addTheme('comingOfAge', '獨立', EMPTY)
    courses.addLecturer('王講師', '牧師', [], EMPTY)
    await wrapper.vm.$nextTick()
    const deletes = () => button(wrapper, t('teacher.settings.delete'))

    await deletes()[0].trigger('click') // the theme
    resolveConfirm(false)
    await flushPromises()
    expect(themes(wrapper, 1)).toEqual(['獨立'])

    await deletes()[0].trigger('click')
    resolveConfirm(true)
    await flushPromises()
    expect(themes(wrapper, 1)).toEqual([])

    const before = courses.lecturers.length
    await deletes().at(-1)!.trigger('click') // the lecturer
    resolveConfirm(false)
    await flushPromises()
    expect(courses.lecturers).toHaveLength(before)

    await deletes().at(-1)!.trigger('click')
    resolveConfirm(true)
    await flushPromises()
    expect(courses.lecturers).toHaveLength(before - 1)
    expect(courses.lecturers.some((l) => l.name === '王講師')).toBe(false)
  })

  it("lists the church's lecturers with their link and courses, and asks to add or edit", async () => {
    const { wrapper, courses } = mountPanel()
    const [course] = courses.courses
    courses.addLecturer('王講師', '牧師', [course.id], CHURCH, 'teacher')
    courses.addLecturer('外地講師', '傳道', [], OTHER)
    await wrapper.vm.$nextTick()

    const cards = wrapper.findAll('.lecturer-card')
    const mine = cards.find((c) => c.text().includes('王講師'))!
    expect(cards.some((c) => c.text().includes('外地講師'))).toBe(false)
    expect(mine.text()).toContain('@teacher')
    expect(mine.text()).toContain(course.title)

    await button(wrapper, t('teacher.settings.addLecturer'))[0].trigger('click')
    await mine.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('open-add-lecturer')).toHaveLength(1)
    expect(wrapper.emitted('open-edit-lecturer')![0][0]).toMatchObject({ name: '王講師' })
  })

  it('lets an admin switch church, and reports it so the lecturer dialog uses it', async () => {
    const { wrapper, courses } = mountPanel(true)
    courses.addTheme('character', '外地主題', OTHER)
    expect(mountPanel(false).wrapper.find('select').exists()).toBe(false)

    await wrapper.find('select').setValue(OTHER)
    expect(wrapper.emitted('update:church')![0]).toEqual([OTHER])
    expect(themes(wrapper, 0)).toEqual(['外地主題'])
  })
})
