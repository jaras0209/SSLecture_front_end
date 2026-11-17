import { describe, it, expect } from 'vitest'
import {
  createId,
  randomHex,
  randomCode,
  randomPassword,
  CODE_ALPHABET,
  PASSWORD_ALPHABET
} from '@/utils/id'
import { passwordChecks } from '@/composables/usePasswordStrength'

describe('randomHex()', () => {
  it('returns 2 lowercase hex chars per byte, zero-padded', () => {
    for (let i = 0; i < 50; i++) {
      expect(randomHex(2)).toMatch(/^[0-9a-f]{4}$/)
    }
  })
})

describe('randomCode()', () => {
  it('uses only characters that are easy to tell apart', () => {
    expect(CODE_ALPHABET).toHaveLength(32) // so every character is equally likely
    expect(CODE_ALPHABET).not.toMatch(/[0O1I]/)
    const code = randomCode(200)
    expect(code).toHaveLength(200)
    expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true)
  })
})

describe('randomPassword()', () => {
  it('uses 56 easy-to-read characters, none that look alike', () => {
    expect(new Set(PASSWORD_ALPHABET).size).toBe(56)
    expect(PASSWORD_ALPHABET).not.toMatch(/[0O1Iol]/)
  })

  it('always has upper case, lower case and a digit, so it meets the password rules', () => {
    for (let i = 0; i < 300; i++) {
      const p = randomPassword()
      expect(p).toHaveLength(10)
      expect([...p].every((c) => PASSWORD_ALPHABET.includes(c))).toBe(true)
      expect(p).toMatch(/[A-Z]/)
      expect(p).toMatch(/[a-z]/)
      expect(p).toMatch(/[2-9]/)
      expect(passwordChecks(p).every((c) => !c.required || c.ok)).toBe(true)
    }
    expect(randomPassword(16)).toHaveLength(16)
  })

  it('does not repeat', () => {
    expect(new Set(Array.from({ length: 1000 }, () => randomPassword())).size).toBe(1000)
  })

  it('picks evenly among the characters of each kind', () => {
    // Overall, digits come up a little more often: a password without one is drawn again
    const counts = new Map<string, number>()
    for (let i = 0; i < 6000; i++)
      for (const c of randomPassword()) counts.set(c, (counts.get(c) ?? 0) + 1)
    expect(counts.size).toBe(56)
    for (const kind of [/[A-Z]/, /[a-z]/, /[2-9]/]) {
      const ns = [...counts].filter(([c]) => kind.test(c)).map(([, n]) => n)
      const mean = ns.reduce((a, b) => a + b, 0) / ns.length
      for (const n of ns) expect(Math.abs(n - mean)).toBeLessThan(mean * 0.2)
    }
  })
})

describe('createId()', () => {
  it('prefixes a 128-bit hex id', () => {
    expect(createId('sess')).toMatch(/^sess_[0-9a-f]{32}$/)
  })

  it('does not repeat even when called within the same millisecond', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId('x')))
    expect(ids.size).toBe(1000)
  })
})
