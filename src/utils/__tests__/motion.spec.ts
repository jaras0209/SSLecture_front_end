import { describe, it, expect, afterEach, vi } from 'vitest'
import { prefersReducedMotion, scrollMotion } from '@/utils/motion'

function systemReducesMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce && query === '(prefers-reduced-motion: reduce)' }))
  )
}

describe('motion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('glides when the system has no preference', () => {
    systemReducesMotion(false)
    expect(prefersReducedMotion()).toBe(false)
    expect(scrollMotion()).toBe('smooth')
  })

  it('jumps straight there when the user asked to reduce motion', () => {
    systemReducesMotion(true)
    expect(prefersReducedMotion()).toBe(true)
    expect(scrollMotion()).toBe('auto')
  })

  it('glides where the browser cannot tell', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(prefersReducedMotion()).toBe(false)
    expect(scrollMotion()).toBe('smooth')
  })
})
