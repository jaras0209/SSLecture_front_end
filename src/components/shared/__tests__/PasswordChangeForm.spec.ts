import { describe, it, expect } from 'vitest'
import PasswordChangeForm from '@/components/shared/PasswordChangeForm.vue'
import { useAuthStore } from '@/stores/auth'
import { mountPrepared, t } from '@/__tests__/helpers'

function mountForm(props: { compact?: boolean } = {}) {
  return mountPrepared(
    PasswordChangeForm,
    () => {
      useAuthStore().login('student', '123456')
    },
    {
      props: { idPrefix: 'x', ...props },
      slots: { default: '<button type="submit">go</button>' }
    }
  )
}

type Wrapper = ReturnType<typeof mountForm>['wrapper']

async function fill(wrapper: Wrapper, old: string, new1: string, new2 = new1) {
  await wrapper.find('#x-old').setValue(old)
  await wrapper.find('#x-new').setValue(new1)
  await wrapper.find('#x-confirm').setValue(new2)
  await wrapper.find('form').trigger('submit')
}

const alert = (wrapper: Wrapper) => wrapper.find('.alert-box')

describe('PasswordChangeForm', () => {
  it('labels every field and names its fill-in purpose for password managers', () => {
    const { wrapper } = mountForm()
    const auto: Record<string, string> = {
      'x-old': 'current-password',
      'x-new': 'new-password',
      'x-confirm': 'new-password'
    }
    for (const [id, autocomplete] of Object.entries(auto)) {
      expect(wrapper.find(`label[for="${id}"]`).exists(), id).toBe(true)
      expect(wrapper.find(`#${id}`).attributes('autocomplete')).toBe(autocomplete)
    }
  })

  it('checks, in order: all filled, matching, strong enough, and different from the current one', async () => {
    const { wrapper } = mountForm()
    await fill(wrapper, '', '')
    expect(alert(wrapper).text()).toBe(t('profile.errFillAll'))
    expect(alert(wrapper).attributes('role')).toBe('alert')
    await fill(wrapper, '123456', 'Better#2026', 'Better#2027')
    expect(alert(wrapper).text()).toBe(t('profile.errMismatch'))
    await fill(wrapper, '123456', 'abc')
    expect(alert(wrapper).text()).toBe(t('auth.passwordRules.tooWeak'))
    await fill(wrapper, 'Better#2026', 'Better#2026')
    expect(alert(wrapper).text()).toBe(t('changePassword.errSame'))
    await fill(wrapper, 'wrong', 'Better#2026')
    expect(alert(wrapper).text()).toBe(t('stores.auth.wrongOldPassword'))
    expect(useAuthStore().usersDb.student.passwordHash).toBe('123456')
    expect(wrapper.emitted('changed')).toBeUndefined()
  })

  it('changes it, says so, empties the fields and tells the page', async () => {
    const { wrapper } = mountForm()
    await fill(wrapper, '123456', 'Better#2026')
    expect(useAuthStore().usersDb.student.passwordHash).toBe('Better#2026')
    expect(alert(wrapper).classes()).toContain('success')
    expect(alert(wrapper).attributes('role')).toBe('status')
    expect(wrapper.emitted('changed')).toEqual([[t('stores.auth.passwordChanged')]])
    for (const id of ['x-old', 'x-new', 'x-confirm']) {
      expect(wrapper.find<HTMLInputElement>(`#${id}`).element.value, id).toBe('')
    }
  })

  it('shows the strength and rules for the new password, tied to that field', async () => {
    const { wrapper } = mountForm()
    const input = wrapper.find('#x-new')
    expect(wrapper.find('#x-strength').exists()).toBe(false)
    expect(input.attributes('aria-describedby')).toBeUndefined()

    await input.setValue('abcdefg1')
    expect(input.attributes('aria-describedby')).toBe('x-strength')
    const ok = wrapper.findAll('#x-strength li.pwd-rule').map((li) => li.classes('rule-ok'))
    // 6+ characters (required); then 8+ characters, mixed case, number, symbol
    expect(ok).toEqual([true, true, false, true, false])
  })

  it('points the confirm field at the mismatch note while they differ', async () => {
    const { wrapper } = mountForm()
    await wrapper.find('#x-new').setValue('Better#2026')
    const confirm = wrapper.find('#x-confirm')
    await confirm.setValue('Better#20')
    expect(wrapper.find('#x-mismatch').text()).toBe(t('profile.pwdMismatch'))
    expect(confirm.attributes('aria-describedby')).toBe('x-mismatch')
    await confirm.setValue('Better#2026')
    expect(wrapper.find('#x-mismatch').exists()).toBe(false)
    expect(confirm.attributes('aria-describedby')).toBeUndefined()
  })

  it('shows and hides each password on its own', async () => {
    const { wrapper } = mountForm()
    const eyes = wrapper.findAll('.pwd-eye-btn')
    expect(eyes).toHaveLength(3)
    await eyes[1].trigger('click')
    expect(wrapper.find('#x-new').attributes('type')).toBe('text')
    expect(wrapper.find('#x-old').attributes('type')).toBe('password')
    expect(eyes[1].attributes('aria-pressed')).toBe('true')
    expect(eyes[1].attributes('aria-label')).toBe(t('common.hidePwd'))
    expect(eyes[0].attributes('aria-label')).toBe(t('common.showPwd'))
  })

  it('uses the smaller fields when compact', () => {
    expect(mountForm().wrapper.find('.form-input-sm').exists()).toBe(false)
    expect(mountForm({ compact: true }).wrapper.findAll('.form-input-sm')).toHaveLength(3)
  })

  it('can be emptied by the page holding it', async () => {
    const { wrapper } = mountForm()
    await fill(wrapper, '', 'x')
    ;(wrapper.vm as unknown as { reset(): void }).reset()
    await wrapper.vm.$nextTick()
    expect(wrapper.find<HTMLInputElement>('#x-new').element.value).toBe('')
    expect(alert(wrapper).exists()).toBe(false)
  })
})
