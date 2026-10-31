import { describe, it, expect, afterEach, vi } from 'vitest'
import OnboardingView from '@/views/OnboardingView.vue'
import { useAuthStore } from '@/stores/auth'
import { mountPrepared, toastTexts, t } from '@/__tests__/helpers'

const CHURCH = '愛與話語'

/** A Google user who has not finished onboarding; `invite` is a code for that role */
function mountOnboarding(inviteRole?: 'parent' | 'teacher') {
  let code = ''
  const result = mountPrepared(OnboardingView, () => {
    const auth = useAuthStore()
    if (inviteRole) code = auth.generateInviteCode(inviteRole, CHURCH, 'admin')
    auth.usersDb.s2 = { passwordHash: 'x', role: 'student', church: CHURCH }
    auth.currentUser = { username: 'oauth_1', role: 'student', loginMethod: 'google' }
  })
  return { ...result, code }
}

type Wrapper = ReturnType<typeof mountOnboarding>['wrapper']

async function enterInvite(wrapper: Wrapper, code: string) {
  const input = wrapper.find('#ob-invite-code')
  await input.setValue(code)
  await input.trigger('input')
}

const submit = (wrapper: Wrapper) => wrapper.find('form').trigger('submit')

describe('OnboardingView', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets a parent pick their children from the church the invite names', async () => {
    vi.useFakeTimers()
    const { wrapper, code } = mountOnboarding('parent')
    expect(wrapper.find('.student-binding-list').exists()).toBe(false)

    await enterInvite(wrapper, code) // fills in the invite's church
    const options = wrapper.findAll('.student-binding-option')
    expect(options.map((o) => o.text())).toEqual(['🎒 student', '🎒 s2'])

    await submit(wrapper)
    expect(toastTexts().at(-1)).toBe(t('auth.validation.parentBindStudent'))
    expect(useAuthStore().currentUser?.church).toBeUndefined()

    await options[1].find('input').setValue(true)
    await submit(wrapper)
    await vi.runAllTimersAsync()
    const auth = useAuthStore()
    expect(auth.currentUser).toMatchObject({ role: 'parent', church: CHURCH })
    expect(auth.childrenOf('oauth_1')).toEqual(['s2'])
  })

  it('starts the choice over when the church changes', async () => {
    const { wrapper, code } = mountOnboarding('parent')
    await enterInvite(wrapper, code)
    await wrapper.findAll('.student-binding-option input')[0].setValue(true)

    await wrapper.find('#ob-church').setValue('主大明') // no students there
    expect(wrapper.find('.alert-box.error').text()).toContain('主大明')
    await submit(wrapper)
    expect(toastTexts().at(-1)).toBe(t('auth.register.noStudentsAlert', { church: '主大明' }))

    await wrapper.find('#ob-church').setValue(CHURCH)
    expect(
      wrapper
        .findAll<HTMLInputElement>('.student-binding-option input')
        .map((i) => i.element.checked)
    ).toEqual([false, false])
  })

  it('asks no one else about children', async () => {
    vi.useFakeTimers()
    const { wrapper, code } = mountOnboarding('teacher')
    await enterInvite(wrapper, code)
    expect(wrapper.find('.student-binding-list').exists()).toBe(false)
    await submit(wrapper)
    await vi.runAllTimersAsync()
    expect(useAuthStore().currentUser).toMatchObject({ role: 'teacher', church: CHURCH })
  })
})
