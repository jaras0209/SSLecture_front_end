import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { homeRouteFor, afterLoginRoute } from '@/router/homeRoute'
import router from '@/router'

describe('homeRouteFor()', () => {
  it.each([
    ['student', '/student'],
    ['teacher', '/teacher'],
    ['pastor', '/teacher'],
    ['parent', '/teacher'],
    ['admin', '/admin']
  ] as const)('sends %s to %s', (role, path) => {
    expect(homeRouteFor(role)).toBe(path)
  })

  it('sends a signed-out user (no role) to the login page', () => {
    expect(homeRouteFor(undefined)).toBe('/login')
  })
})

describe('afterLoginRoute()', () => {
  setActivePinia(createPinia())

  it('goes back to the page the visitor was sent away from, with its query', () => {
    expect(afterLoginRoute('/admin', 'admin', router)).toBe('/admin')
    expect(afterLoginRoute('/teacher?tab=bookings', 'pastor', router)).toBe('/teacher?tab=bookings')
  })

  it("doesn't go to a page the role can't open", () => {
    expect(afterLoginRoute('/admin', 'student', router)).toBeUndefined()
    expect(afterLoginRoute('/student', 'teacher', router)).toBeUndefined()
  })

  it.each([
    ['another site', 'https://evil.example/phish'],
    ['a protocol-relative URL', '//evil.example/phish'],
    ['a backslash trick', '/\\evil.example'],
    ['a relative path', 'admin'],
    ['the login page', '/login'],
    ['the OAuth callback', '/login/callback'],
    ['the unauthorized page', '/unauthorized'],
    ['a page that does not exist', '/no-such-page']
  ])('ignores %s', (_label, redirect) => {
    expect(afterLoginRoute(redirect, 'admin', router)).toBeUndefined()
  })

  it.each([undefined, null, ['/admin'], 42])(
    'ignores a missing or malformed value (%j)',
    (value) => {
      expect(afterLoginRoute(value, 'admin', router)).toBeUndefined()
    }
  )
})
