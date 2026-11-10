import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  beginSession,
  endSession,
  sessionMeta,
  sessionExpired,
  touchSession,
  settleSessionOnStart,
  noteSignOutReason,
  takeSignOutReason,
  IDLE_LIMIT_MS,
  REMEMBERED_LIMIT_MS
} from '@/utils/session'

const T0 = Date.UTC(2026, 10, 10, 9, 0)
const MIN = 60 * 1000
const signedIn = () => localStorage.getItem('superstart_user') !== null
const signIn = () =>
  localStorage.setItem('superstart_user', JSON.stringify({ username: 'student' }))

/** Make this test run like a tab opened fresh (sessionStorage starts empty in a new tab) */
const newTab = () => sessionStorage.clear()

/** Another open tab of the site, answering "anyone open?" like a running tab would */
function anotherOpenTab() {
  const tab = new BroadcastChannel('superstart_tabs')
  tab.addEventListener('message', (e: MessageEvent) => {
    if (e.data?.type === 'anyone-open?') tab.postMessage({ type: 'open', to: e.data.from })
  })
  return tab
}

describe('session timing', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('ends an unremembered sign-in after 2 hours idle', () => {
    beginSession(false, T0)
    expect(sessionExpired(T0 + IDLE_LIMIT_MS)).toBe(false)
    expect(sessionExpired(T0 + IDLE_LIMIT_MS + 1)).toBe(true)
  })

  it('keeps a remembered one for 30 days without use', () => {
    beginSession(true, T0)
    expect(sessionExpired(T0 + IDLE_LIMIT_MS + 1)).toBe(false)
    expect(sessionExpired(T0 + REMEMBERED_LIMIT_MS + 1)).toBe(true)
  })

  it('counts from the last activity, recorded at most every 30 seconds', () => {
    beginSession(false, T0)
    touchSession(T0 + 10_000) // too soon after the last one: not written
    expect(sessionMeta()?.lastActiveAt).toBe(T0)
    touchSession(T0 + 90 * MIN)
    expect(sessionMeta()?.lastActiveAt).toBe(T0 + 90 * MIN)
    expect(sessionExpired(T0 + 90 * MIN + IDLE_LIMIT_MS)).toBe(false)
  })

  it('has nothing to time once signed out', () => {
    beginSession(false, T0)
    endSession()
    expect(sessionMeta()).toBeNull()
    expect(sessionExpired(T0 + REMEMBERED_LIMIT_MS * 2)).toBe(false)
    touchSession(T0 + MIN) // doesn't start one
    expect(sessionMeta()).toBeNull()
  })

  it('tells the login page why, once', () => {
    noteSignOutReason('idle')
    expect(takeSignOutReason()).toBe('idle')
    expect(takeSignOutReason()).toBeNull()
  })
})

describe('settleSessionOnStart()', () => {
  const tabs: BroadcastChannel[] = []
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  afterEach(() => {
    tabs.splice(0).forEach((t) => t.close())
  })

  it('signs out a sign-in left idle too long, and says why', async () => {
    signIn()
    beginSession(true, T0)
    await settleSessionOnStart(T0 + REMEMBERED_LIMIT_MS + 1)
    expect(signedIn()).toBe(false)
    expect(sessionMeta()).toBeNull()
    expect(takeSignOutReason()).toBe('idle')
  })

  it('signs out an unremembered sign-in once the browser has been closed', async () => {
    signIn()
    beginSession(false, T0)
    newTab() // the browser reopened: no tab of the site is open
    await settleSessionOnStart(T0 + MIN)
    expect(signedIn()).toBe(false)
    expect(takeSignOutReason()).toBeNull() // nothing to explain: they closed it themselves
  })

  it('keeps it through a reload of the same tab', async () => {
    signIn()
    beginSession(false, T0)
    await settleSessionOnStart(T0 + MIN)
    expect(signedIn()).toBe(true)
  })

  it('keeps it in a new tab while another tab of the site is open', async () => {
    signIn()
    beginSession(false, T0)
    tabs.push(anotherOpenTab())
    newTab()
    await settleSessionOnStart(T0 + MIN)
    expect(signedIn()).toBe(true)
  })

  it('keeps a remembered sign-in after the browser was closed', async () => {
    signIn()
    beginSession(true, T0)
    newTab()
    await settleSessionOnStart(T0 + 3 * 24 * 60 * MIN)
    expect(signedIn()).toBe(true)
  })

  it('starts timing a sign-in from before sessions were timed, without signing it out', async () => {
    signIn()
    newTab()
    await settleSessionOnStart(T0)
    expect(signedIn()).toBe(true)
    expect(sessionMeta()).toEqual({ remember: false, lastActiveAt: T0 })
  })

  it('clears a leftover timer when nobody is signed in', async () => {
    beginSession(false, T0)
    await settleSessionOnStart(T0)
    expect(sessionMeta()).toBeNull()
  })
})
