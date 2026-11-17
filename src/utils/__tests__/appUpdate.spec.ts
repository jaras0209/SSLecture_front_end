import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  appUpdateNeeded,
  isStaleFileError,
  recoverFromStaleFile,
  reloadApp,
  RELOAD_GUARD_MS
} from '@/utils/appUpdate'

// Stand in for location, so "reloading" can be observed
const realLocation = window.location
let nav: { assign: ReturnType<typeof vi.fn>; reload: ReturnType<typeof vi.fn> }

beforeEach(() => {
  nav = { assign: vi.fn(), reload: vi.fn() }
  Object.defineProperty(window, 'location', { configurable: true, value: nav })
  sessionStorage.clear()
  appUpdateNeeded.value = false
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T10:00:00Z'))
})
afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const stale = () =>
  new TypeError('Failed to fetch dynamically imported module: /assets/LoginView-old.js')

describe('isStaleFileError', () => {
  it.each([
    ['Chrome', 'Failed to fetch dynamically imported module: https://x/assets/a.js'],
    ['Firefox', 'error loading dynamically imported module: https://x/assets/a.js'],
    ['Safari', 'Importing a module script failed.'],
    ['Vite CSS preload', 'Unable to preload CSS for /assets/a.css']
  ])("recognises %s's message", (_, message) => {
    expect(isStaleFileError(new TypeError(message))).toBe(true)
  })

  it('leaves other errors alone', () => {
    expect(isStaleFileError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isStaleFileError(undefined)).toBe(false)
    expect(isStaleFileError('Failed to fetch dynamically imported module')).toBe(true)
  })
})

describe('recoverFromStaleFile', () => {
  it('reloads into the page the user was going to', () => {
    expect(recoverFromStaleFile(stale(), '/SSLecture_front_end/login')).toBe(true)
    expect(nav.assign).toHaveBeenCalledWith('/SSLecture_front_end/login')
    expect(appUpdateNeeded.value).toBe(false)
  })

  it('reloads only once in a short while, then asks instead', () => {
    recoverFromStaleFile(stale(), '/a')
    vi.setSystemTime(Date.now() + RELOAD_GUARD_MS - 1) // still failing right after the reload
    recoverFromStaleFile(stale(), '/a')
    expect(nav.assign).toHaveBeenCalledTimes(1)
    expect(appUpdateNeeded.value).toBe(true)

    appUpdateNeeded.value = false
    vi.setSystemTime(Date.now() + 1) // a later update can reload again
    recoverFromStaleFile(stale(), '/b')
    expect(nav.assign).toHaveBeenLastCalledWith('/b')
  })

  it("asks rather than reloads when it isn't a change of page (something may be half typed)", () => {
    expect(recoverFromStaleFile(stale())).toBe(true)
    expect(nav.assign).not.toHaveBeenCalled()
    expect(nav.reload).not.toHaveBeenCalled()
    expect(appUpdateNeeded.value).toBe(true)
  })

  it("asks rather than risks reloading over and over when it can't keep track", () => {
    vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    recoverFromStaleFile(stale(), '/a')
    expect(nav.assign).not.toHaveBeenCalled()
    expect(appUpdateNeeded.value).toBe(true)
  })

  it('ignores other errors', () => {
    expect(recoverFromStaleFile(new Error('boom'), '/a')).toBe(false)
    expect(nav.assign).not.toHaveBeenCalled()
    expect(appUpdateNeeded.value).toBe(false)
  })
})

describe('reloadApp', () => {
  it('reloads the page', () => {
    reloadApp()
    expect(nav.reload).toHaveBeenCalled()
  })
})
