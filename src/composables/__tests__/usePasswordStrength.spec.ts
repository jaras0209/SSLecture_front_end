import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { calcPasswordStrength, usePasswordStrength } from '@/composables/usePasswordStrength'
import { withSetup, t } from '@/__tests__/helpers'

describe('calcPasswordStrength()', () => {
  it.each([
    ['', 0],
    ['abc12', 0], // under 6 characters
    ['abcdef', 0], // 6+ characters only
    ['abcdef1', 1], // + digit
    ['abcdefgh', 1], // 8+ characters
    ['abcdefg1', 2], // 8+ characters and a digit
    ['Abcdefg1', 3], // + mixed case
    ['Abcdef1!', 3], // capped at 3
    ['abcdef!x', 2] // 8+ characters and a symbol
  ])('%j → %i', (pwd, score) => {
    expect(calcPasswordStrength(pwd)).toBe(score)
  })
})

describe('usePasswordStrength()', () => {
  it('reacts to the password and exposes label and classes', () => {
    const pwd = ref('')
    const { strength, label, textClass, barClass } = withSetup(() => usePasswordStrength(pwd))

    expect(strength.value).toBe(0)
    expect(label.value).toBe(t('passwordStrength.weak'))
    expect(textClass.value).toBe('text-weak')
    expect([0, 1, 2].map(barClass)).toEqual(['bar-weak', 'bar-empty', 'bar-empty'])

    pwd.value = 'abcdefg1'
    expect(strength.value).toBe(2)
    expect(label.value).toBe(t('passwordStrength.medium'))
    expect(textClass.value).toBe('text-medium')
    expect([0, 1, 2].map(barClass)).toEqual(['bar-medium', 'bar-medium', 'bar-empty'])

    pwd.value = 'Abcdef1!'
    expect(label.value).toBe(t('passwordStrength.strong'))
    expect([0, 1, 2].map(barClass)).toEqual(['bar-strong', 'bar-strong', 'bar-strong'])
  })
})
