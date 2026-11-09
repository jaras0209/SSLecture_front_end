import { describe, it, expect } from 'vitest'
import { createId, randomHex, randomCode, CODE_ALPHABET } from '@/utils/id'

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

describe('createId()', () => {
  it('prefixes a 128-bit hex id', () => {
    expect(createId('sess')).toMatch(/^sess_[0-9a-f]{32}$/)
  })

  it('does not repeat even when called within the same millisecond', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId('x')))
    expect(ids.size).toBe(1000)
  })
})
