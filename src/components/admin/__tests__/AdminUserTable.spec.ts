import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AdminUserTable from '@/components/admin/AdminUserTable.vue'
import { useAuthStore } from '@/stores/auth'
import { resolveConfirm } from '@/composables/useToast'
import { mountWith } from '@/__tests__/helpers'

function mountAsAdmin() {
  const result = mountWith(AdminUserTable)
  const auth = useAuthStore()
  auth.currentUser = { username: 'admin', role: 'admin', loginMethod: 'credentials' }
  auth.usersDb.s2 = { passwordHash: 'x', role: 'student', church: '愛與話語' }
  auth.bindChild('parent', 's2')
  return { ...result, auth }
}

const row = (wrapper: ReturnType<typeof mountWith>['wrapper'], username: string) =>
  wrapper.findAll('tbody tr').find((tr) => tr.find('.username-cell').text().includes(username))!

describe('AdminUserTable', () => {
  it("removes a deleted student from their parents' accounts", async () => {
    const { wrapper, auth } = mountAsAdmin()
    await wrapper.vm.$nextTick()
    await row(wrapper, 's2').find('.delete-btn').trigger('click')
    resolveConfirm(true)
    await flushPromises()
    expect(auth.usersDb.s2).toBeUndefined()
    expect(auth.childrenOf('parent')).toEqual(['student'])
  })

  it('unbinds a student from their parents when they stop being a student', async () => {
    const { wrapper, auth } = mountAsAdmin()
    await wrapper.vm.$nextTick()
    await row(wrapper, 's2').find('select').setValue('teacher')
    expect(auth.usersDb.s2.role).toBe('teacher')
    expect(auth.parentsOf('s2')).toEqual([])
  })

  it('offers a gender setting for teachers and students only', async () => {
    const { wrapper, auth } = mountAsAdmin()
    await wrapper.vm.$nextTick()
    expect(row(wrapper, 'teacher').find('.gender-select').exists()).toBe(true)
    expect(row(wrapper, 'parent').find('.gender-select').exists()).toBe(false)
    expect(row(wrapper, 'pastor').find('.gender-select').exists()).toBe(false)

    await row(wrapper, 's2').find('.gender-select').setValue('male')
    expect(auth.usersDb.s2.gender).toBe('male')
  })
})
