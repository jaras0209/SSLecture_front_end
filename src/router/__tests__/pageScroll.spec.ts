import { describe, it, expect, afterEach, vi } from 'vitest'
import { pageScroll, tallEnoughFor } from '@/router'

/** Pretend the page is this tall (happy-dom doesn't lay pages out) */
function pageHeight(px: number) {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    get: () => px
  })
}

describe('pageScroll', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns to where the user was on Back / Forward', async () => {
    pageHeight(2000)
    const saved = { left: 0, top: 840 }
    expect(await pageScroll('/student', '/unauthorized', saved)).toBe(saved)
  })

  it('waits for the page to grow tall enough before returning there', async () => {
    pageHeight(500)
    const saved = { left: 0, top: 840 }
    let restored = false
    const done = pageScroll('/student', '/unauthorized', saved) as Promise<unknown>
    void done.then(() => (restored = true))
    await new Promise((r) => setTimeout(r, 50))
    expect(restored).toBe(false) // the page can't scroll that far yet
    pageHeight(2000) // the rest of the page has rendered
    expect(await done).toBe(saved)
  })

  it('gives up waiting after a while, so a page that stays short still settles', async () => {
    pageHeight(100)
    const start = performance.now()
    await tallEnoughFor(5000, 120)
    expect(performance.now() - start).toBeGreaterThanOrEqual(100)
  })

  it('starts a new page at the top', () => {
    expect(pageScroll('/unauthorized', '/student', null)).toEqual({ top: 0, behavior: 'smooth' })
  })

  it("doesn't jump when only the query changes on the same page", () => {
    expect(pageScroll('/login', '/login', null)).toBe(false)
  })

  it('jumps rather than glides when the user asked to reduce motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    expect(pageScroll('/admin', '/login', null)).toEqual({ top: 0, behavior: 'auto' })
  })
})
