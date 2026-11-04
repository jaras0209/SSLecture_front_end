import { describe, it, expect } from 'vitest'
import PasswordStrengthMeter from '@/components/shared/PasswordStrengthMeter.vue'
import { isStrongEnough } from '@/composables/usePasswordStrength'
import { mountWith, t } from '@/__tests__/helpers'

const mountMeter = (password: string) => mountWith(PasswordStrengthMeter, { props: { password } })

/** Which rule items show as met, in the order shown */
const met = (password: string) =>
  mountMeter(password)
    .wrapper.findAll('li.pwd-rule')
    .map((li) => li.classes('rule-ok'))

describe('PasswordStrengthMeter', () => {
  it('shows nothing until something is typed', () => {
    expect(mountMeter('').wrapper.find('.pwd-strength-section').exists()).toBe(false)
  })

  it('lists the rules as they are checked: 6 characters, then any two of four', () => {
    const { wrapper } = mountMeter('x')
    const lines = wrapper
      .findAll('.pwd-rules-list li')
      .map((li) => li.text().replace(/^[✅❌]\s*/u, ''))
    expect(lines).toEqual([
      t('auth.passwordRules.minLength'),
      t('auth.passwordRules.pickTwo'),
      t('auth.passwordRules.length8'),
      t('auth.passwordRules.mixedCase'),
      t('auth.passwordRules.number'),
      t('auth.passwordRules.special')
    ])
  })

  // What the list says matches what is accepted: 6+ characters and two of the other four
  it.each([
    ['abcdefg1', [true, true, false, true, false], true], // no capitals, still enough
    ['abcdefgh!', [true, true, false, false, true], true], // no digit, still enough
    ['Abcde1', [true, false, true, true, false], true], // 6 characters is enough with two
    ['abcdefgh', [true, true, false, false, false], false], // only one of the four
    ['ABCDEF1', [true, false, false, true, false], false], // capitals alone aren't mixed case
    ['Ab1!', [false, false, true, true, true], false] // under 6 characters
  ])('%j', (password, expected, accepted) => {
    expect(met(password)).toEqual(expected)
    expect(isStrongEnough(password)).toBe(accepted)
    const shown = expected.slice(1).filter(Boolean).length >= 2 && expected[0]
    expect(shown).toBe(accepted)
  })

  it('names the strength', () => {
    const { wrapper } = mountMeter('Abcdef1!')
    expect(wrapper.find('.pwd-strength-label').text()).toBe(t('passwordStrength.strong'))
  })
})
