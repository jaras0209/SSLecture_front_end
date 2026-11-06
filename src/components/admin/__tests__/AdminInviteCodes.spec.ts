import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AdminInviteCodes from '@/components/admin/AdminInviteCodes.vue'
import { useAuthStore } from '@/stores/auth'
import { resolveConfirm, useToastProvider } from '@/composables/useToast'
import { mountWith, toastTexts, t } from '@/__tests__/helpers'

function mountAsAdmin() {
  const result = mountWith(AdminInviteCodes)
  useAuthStore().currentUser = { username: 'admin', role: 'admin', loginMethod: 'credentials' }
  return result
}

/** The status shown in each row, by code */
const statuses = (wrapper: ReturnType<typeof mountWith>['wrapper']) =>
  Object.fromEntries(
    wrapper
      .findAll('.invite-table tbody tr')
      .map((tr) => [tr.find('.invite-code-cell').text(), tr.find('.invite-status-badge').text()])
  )

describe('AdminInviteCodes', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

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

  it('says when there are no codes yet', () => {
    const { wrapper } = mountAsAdmin()
    expect(wrapper.text()).toContain(t('admin.inviteCode.emptyList'))
    expect(wrapper.find('.invite-table').exists()).toBe(false)
  })

  it('asks for a church except for an admin code, and uses the chosen expiry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-01T00:00:00Z'))
    const { wrapper } = mountAsAdmin()
    await wrapper.find('#invite-church-select').setValue('主大明')
    const expiry = wrapper.find<HTMLSelectElement>('#invite-expiry-select')
    expiry.element.value = '30'
    await expiry.trigger('change')
    await wrapper.find('#btn-generate-invite').trigger('click')
    const teacherCode = wrapper.find('.generated-code-text').text()
    expect(useAuthStore().validateInviteCode(teacherCode)).toMatchObject({
      church: '主大明',
      expiresAt: '2026-12-01T00:00:00.000Z'
    })

    await wrapper.find('#invite-role-select').setValue('admin')
    expect(wrapper.find('#invite-church-select').exists()).toBe(false)
    await wrapper.find('#btn-generate-invite').trigger('click')
    const adminCode = wrapper.find('.generated-code-text').text()
    expect(useAuthStore().validateInviteCode(adminCode)?.church).toBeUndefined()
  })

  it('shows whether each code is usable, used, revoked or expired', async () => {
    const { wrapper } = mountAsAdmin()
    const auth = useAuthStore()
    const [active, used, revoked, expired] = ['student', 'teacher', 'parent', 'pastor'].map(
      (role) => auth.generateInviteCode(role as 'student', '愛與話語', 'admin')
    )
    auth.consumeInviteCode(used, 'newkid')
    auth.revokeInviteCode(revoked)
    auth.inviteCodesDb[expired].expiresAt = '2020-01-01T00:00:00.000Z'
    await wrapper.vm.$nextTick()

    expect(statuses(wrapper)).toMatchObject({
      [active]: t('admin.inviteCode.statusActive'),
      [used]: `${t('admin.inviteCode.statusUsed')} (newkid)`,
      [revoked]: t('admin.inviteCode.statusRevoked'),
      [expired]: t('admin.inviteCode.statusExpired')
    })
    // only a code that is neither used nor revoked can be revoked
    const revokable = wrapper
      .findAll('.invite-table tbody tr')
      .filter((tr) => tr.find('.btn-danger').exists())
      .map((tr) => tr.find('.invite-code-cell').text())
    expect(revokable.sort()).toEqual([active, expired].sort())
  })

  it('copies the new code, or shows it when the browser cannot copy', async () => {
    const { wrapper } = mountAsAdmin()
    await wrapper.find('#btn-generate-invite').trigger('click')
    const code = wrapper.find('.generated-code-text').text()
    const copy = async () => {
      await wrapper.find('#btn-copy-invite').trigger('click')
      await flushPromises()
    }

    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await copy()
    expect(writeText).toHaveBeenCalledWith(code)
    expect(toastTexts().at(-1)).toBe(t('admin.inviteCode.copySuccess'))

    // permission refused
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error()) } })
    await copy()
    expect(toastTexts().at(-1)).toBe(t('admin.inviteCode.copyFallback', { code }))

    // no clipboard at all (older browser, or not served over HTTPS)
    vi.stubGlobal('navigator', {})
    useToastProvider().toasts.value = []
    await copy()
    expect(toastTexts().at(-1)).toBe(t('admin.inviteCode.copyFallback', { code }))
  })
})
