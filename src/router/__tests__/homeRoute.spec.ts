import { describe, it, expect } from 'vitest'
import { homeRouteFor } from '@/router/homeRoute'

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
