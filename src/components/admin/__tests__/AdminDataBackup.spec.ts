import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AdminDataBackup from '@/components/admin/AdminDataBackup.vue'
import { useAuthStore } from '@/stores/auth'
import { resolveConfirm, useToastProvider } from '@/composables/useToast'
import { createBackup, lastBackupAt } from '@/utils/backup'
import { takeSignOutReason } from '@/utils/session'
import { mountPrepared, t } from '@/__tests__/helpers'

function mountAsAdmin() {
  return mountPrepared(AdminDataBackup, () => {
    useAuthStore().currentUser = { username: 'admin', role: 'admin', loginMethod: 'credentials' }
  })
}

type Wrapper = ReturnType<typeof mountAsAdmin>['wrapper']

/** Choose a file in the restore picker */
async function choose(wrapper: Wrapper, text: string) {
  const input = wrapper.find<HTMLInputElement>('#backup-file')
  const file = new File([text], 'backup.json', { type: 'application/json' })
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null')

describe('AdminDataBackup', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resolveConfirm(false)
  })

  it('downloads everything as a dated file', async () => {
    const { wrapper } = mountAsAdmin()
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      blobs.push(b as Blob)
      return 'blob:backup'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    let downloaded = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloaded = this.download
    })

    await wrapper.find('#btn-export-backup').trigger('click')
    expect(downloaded).toMatch(/^sslecture-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/)
    const backup = JSON.parse(await blobs[0].text())
    expect(backup.app).toBe('sslecture')
    expect(Object.keys(backup.data.superstart_users_db)).toContain('admin')
    await flushPromises()
    expect(useToastProvider().toasts.value.at(-1)?.text).toBe(t('admin.backup.exported'))
  })

  it('says when this computer last made a backup', async () => {
    const { wrapper } = mountAsAdmin()
    const last = () => wrapper.find('.backup-last')
    expect(last().text()).toBe(t('admin.backup.neverExported'))
    expect(last().classes()).toContain('overdue')

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await wrapper.find('#btn-export-backup').trigger('click')
    expect(last().text()).toContain('今天')
    expect(last().classes()).not.toContain('overdue')
    expect(lastBackupAt()).not.toBeNull()
    expect(wrapper.emitted('exported')).toHaveLength(1)
  })

  it('says why a file can’t be restored, and changes nothing', async () => {
    const { wrapper } = mountAsAdmin()
    await choose(wrapper, '{"not":"a backup"}')
    expect(wrapper.find('.backup-problem').text()).toBe(t('admin.backup.problem.notBackup'))
    expect(useToastProvider().confirmState.value.visible).toBe(false)
    expect(useAuthStore().isAuthenticated).toBe(true)
  })

  it('restores only after confirming what will be replaced', async () => {
    const { wrapper } = mountAsAdmin()
    const auth = useAuthStore()
    auth.usersDb.restored_user = { passwordHash: 'x', role: 'student', church: '愛與話語' }
    const backup = createBackup(new Date('2026-11-01T02:00:00Z'))
    delete auth.usersDb.restored_user
    const accounts = Object.keys(backup.data.superstart_users_db as object).length

    await choose(wrapper, JSON.stringify(backup))
    const { confirmState } = useToastProvider()
    expect(confirmState.value.message).toContain(String(accounts))
    resolveConfirm(false)
    await flushPromises()
    expect(wrapper.emitted('restored')).toBeUndefined()

    await choose(wrapper, JSON.stringify(backup))
    resolveConfirm(true)
    await flushPromises()
    expect(stored('superstart_users_db').restored_user).toBeDefined()
    // everyone signs in again, and the login page says why
    expect(auth.isAuthenticated).toBe(false)
    expect(takeSignOutReason()).toBe('restored')
    expect(wrapper.emitted('restored')).toHaveLength(1)
  })

  it('keeps the file picker reachable by keyboard and described', () => {
    const { wrapper } = mountAsAdmin()
    const input = wrapper.find('#backup-file')
    expect(wrapper.find('label[for="backup-file"]').text()).toBe(t('admin.backup.import'))
    expect(input.attributes('aria-describedby')).toBe('backup-import-hint')
    expect(input.attributes('tabindex')).toBeUndefined()
  })
})
