import { describe, it, expect } from 'vitest'
import AdminCreateUserPanel from '@/components/admin/AdminCreateUserPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { mountWith, t } from '@/__tests__/helpers'

describe('AdminCreateUserPanel', () => {
  it('validates the fields and refuses taken usernames', async () => {
    const { wrapper } = mountWith(AdminCreateUserPanel)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('.alert-box.error').text()).toBe(t('auth.validation.fillAll'))

    await wrapper.find('#new-username').setValue('student')
    await wrapper.find('#new-password').setValue('pw')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('.alert-box.error').text()).toBe(t('admin.createUser.usernameTaken'))
  })

  it('creates the user, then clears the form', async () => {
    const { wrapper } = mountWith(AdminCreateUserPanel)
    await wrapper.find('#new-username').setValue('pastor2')
    await wrapper.find('#new-password').setValue('pw')
    await wrapper.find('#new-role').setValue('pastor')
    await wrapper.find('form').trigger('submit')

    expect(useAuthStore().usersDb.pastor2).toMatchObject({ role: 'pastor', passwordHash: 'pw' })
    expect(wrapper.find('.alert-box.success').exists()).toBe(true)
    expect((wrapper.find('#new-username').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#new-role').element as HTMLSelectElement).value).toBe('student')
  })

  it('does not assign a church to admins', async () => {
    const { wrapper } = mountWith(AdminCreateUserPanel)
    await wrapper.find('#new-username').setValue('admin2')
    await wrapper.find('#new-password').setValue('pw')
    await wrapper.find('#new-role').setValue('admin')
    await wrapper.find('form').trigger('submit')
    expect(useAuthStore().usersDb.admin2.church).toBeUndefined()
  })
})
