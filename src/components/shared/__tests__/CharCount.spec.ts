import { describe, it, expect } from 'vitest'
import CharCount from '@/components/shared/CharCount.vue'
import { mountWith, t } from '@/__tests__/helpers'
import { MAX_LENGTH, NEAR_LIMIT } from '@/utils/limits'
import { USERNAME_MAX } from '@/utils/account'
import { AVATAR_URL_MAX } from '@/utils/avatar'

describe('CharCount', () => {
  it('shows how much of the limit is used', () => {
    const { wrapper } = mountWith(CharCount, { props: { length: 120, max: 2000 } })
    expect(wrapper.text()).toBe(t('common.charCount', { n: 120, max: 2000 }))
    expect(wrapper.classes()).not.toContain('char-count-near')
  })

  it('stands out once the text is close to the limit', async () => {
    const { wrapper } = mountWith(CharCount, { props: { length: 1799, max: 2000 } })
    expect(wrapper.classes()).not.toContain('char-count-near')
    await wrapper.setProps({ length: 2000 * NEAR_LIMIT })
    expect(wrapper.classes()).toContain('char-count-near')
  })
})

describe('MAX_LENGTH', () => {
  it('reuses the rules that already exist elsewhere', () => {
    expect(MAX_LENGTH.username).toBe(USERNAME_MAX)
    expect(MAX_LENGTH.avatarUrl).toBe(AVATAR_URL_MAX)
  })

  it('lets every older password through the sign-in field', () => {
    expect(MAX_LENGTH.password).toBeGreaterThan(MAX_LENGTH.newPassword)
    // bcrypt reads at most 72 bytes; a new password must fit even in 1-byte characters
    expect(MAX_LENGTH.newPassword).toBeLessThanOrEqual(72)
  })

  it('accepts an email address as the sign-in name', () => {
    expect(MAX_LENGTH.identifier).toBeGreaterThanOrEqual(MAX_LENGTH.email)
    expect(MAX_LENGTH.identifier).toBeGreaterThanOrEqual(MAX_LENGTH.username)
  })
})
