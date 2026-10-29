import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AdminInviteCodes from '@/components/admin/AdminInviteCodes.vue'
import { useAuthStore } from '@/stores/auth'
import { resolveConfirm, useToastProvider } from '@/composables/useToast'
import { mountWith } from '@/__tests__/helpers'

function mountAsAdmin() {
  const result = mountWith(AdminInviteCodes)
  useAuthStore().currentUser = { username: 'admin', role: 'admin', loginMethod: 'credentials' }
  return result
}

describe('AdminInviteCodes', () => {
  it('generates a code for the chosen role and church and lists it', async () => {
    const { wrapper } = mountAsAdmin()
    await wrapper.find('#invite-role-select').setValue('parent')
    await wrapper.find('#btn-generate-invite').trigger('click')

    const code = wrapper.find('.generated-code-text').text()
    expect(code).toMatch(/^SS-PAR-[0-9A-F]{4}$/)
    expect(wrapper.find('.invite-table').text()).toContain(code)
    expect(useAuthStore().validateInviteCode(code)).toMatchObject({
      role: 'parent',
      createdBy: 'admin'
    })
  })

  it('revokes a code only after confirming', async () => {
    const { wrapper } = mountAsAdmin()
    await wrapper.find('#btn-generate-invite').trigger('click')
    const code = wrapper.find('.generated-code-text').text()
    const revoke = () => wrapper.find('.invite-table .btn-danger').trigger('click')

    await revoke()
    expect(useToastProvider().confirmState.value.visible).toBe(true)
    resolveConfirm(false)
    await flushPromises()
    expect(useAuthStore().validateInviteCode(code)).not.toBeNull()

    await revoke()
    resolveConfirm(true)
    await flushPromises()
    expect(useAuthStore().validateInviteCode(code)).toBeNull()
    expect(wrapper.find('.invite-table .btn-danger').exists()).toBe(false)
  })
})
