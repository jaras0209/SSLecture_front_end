import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { safeGet, safeSet, safeRemove, safeGetAll } from '@/utils/storage'

describe('safeGet', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns fallback when key does not exist', () => {
    expect(safeGet('missing_key', { default: true })).toEqual({ default: true })
  })

  it('parses and returns stored value', () => {
    localStorage.setItem('test_key', JSON.stringify({ name: 'Alice' }))
    expect(safeGet('test_key', null)).toEqual({ name: 'Alice' })
  })

  it('returns fallback and warns on corrupted JSON', () => {
    localStorage.setItem('bad_key', 'not-valid-json{{{{')
    const result = safeGet('bad_key', 42)
    expect(result).toBe(42)
    expect(console.warn).toHaveBeenCalledOnce()
  })

  it('clears the key on parse error when clearOnError=true', () => {
    localStorage.setItem('corrupt_key', '}{')
    safeGet('corrupt_key', null, { clearOnError: true })
    expect(localStorage.getItem('corrupt_key')).toBeNull()
  })

  it('does NOT clear the key on parse error when clearOnError=false (default)', () => {
    localStorage.setItem('corrupt_key2', '}{')
    safeGet('corrupt_key2', null)
    expect(localStorage.getItem('corrupt_key2')).toBe('}{')
  })

  it('works with array fallbacks', () => {
    expect(safeGet<string[]>('arr_key', [])).toEqual([])
  })

  it('works with null fallback', () => {
    expect(safeGet<null>('null_key', null)).toBeNull()
  })
})

describe('safeSet', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serializes and stores the value', () => {
    safeSet('obj_key', { foo: 'bar' })
    expect(localStorage.getItem('obj_key')).toBe(JSON.stringify({ foo: 'bar' }))
  })

  it('returns true on success', () => {
    expect(safeSet('ok_key', [1, 2, 3])).toBe(true)
  })

  it('returns false and warns when the underlying write throws', () => {
    // Directly patch JSON.stringify to throw so the catch branch is exercised
    // (happy-dom localStorage is not patchable, but JSON.stringify is)
    const origStringify = JSON.stringify
    JSON.stringify = () => { throw new Error('Simulated serialization error') }
    try {
      expect(safeSet('err_key', { x: 1 })).toBe(false)
      expect(console.warn).toHaveBeenCalledOnce()
    } finally {
      JSON.stringify = origStringify
    }
  })
})

describe('safeRemove', () => {
  beforeEach(() => localStorage.clear())

  it('removes an existing key', () => {
    localStorage.setItem('rem_key', 'value')
    safeRemove('rem_key')
    expect(localStorage.getItem('rem_key')).toBeNull()
  })

  it('does not throw when removing a non-existent key', () => {
    expect(() => safeRemove('ghost_key')).not.toThrow()
  })
})

describe('safeGetAll', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads multiple keys at once', () => {
    localStorage.setItem('k1', JSON.stringify({ a: 1 }))
    localStorage.setItem('k2', JSON.stringify([1, 2]))

    const result = safeGetAll({
      first: { key: 'k1', fallback: {} as { a: number } },
      second: { key: 'k2', fallback: [] as number[] },
    })

    expect(result.first).toEqual({ a: 1 })
    expect(result.second).toEqual([1, 2])
  })

  it('returns individual fallbacks for missing keys', () => {
    const result = safeGetAll({
      sessions: { key: 'missing_sessions', fallback: {} as Record<string, unknown> },
      attendees: { key: 'missing_attendees', fallback: [] as unknown[] },
    })
    expect(result.sessions).toEqual({})
    expect(result.attendees).toEqual([])
  })
})
