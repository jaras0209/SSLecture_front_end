import { describe, it, expect } from 'vitest'
import { contentSecurityPolicy } from '@/utils/csp'

/** The policy as { directive: [values] } */
const parse = (policy: string) =>
  Object.fromEntries(
    policy.split('; ').map((d) => {
      const [name, ...values] = d.split(' ')
      return [name, values]
    })
  )

describe('contentSecurityPolicy()', () => {
  it('runs only our own scripts: no inline code, no eval', () => {
    const csp = parse(contentSecurityPolicy('https://api.example.com'))
    expect(csp['script-src']).toEqual(["'self'"])
    expect(csp['default-src']).toEqual(["'self'"])
    expect(csp['object-src']).toEqual(["'none'"])
    expect(contentSecurityPolicy('https://api.example.com')).not.toMatch(/unsafe-(inline|eval)/)
  })

  it('connects only to us and the API, by its origin', () => {
    expect(parse(contentSecurityPolicy('https://api.example.com/v1/'))['connect-src']).toEqual([
      "'self'",
      'https://api.example.com'
    ])
    expect(parse(contentSecurityPolicy('http://localhost:8080'))['connect-src']).toEqual([
      "'self'",
      'http://localhost:8080'
    ])
    // no API configured, or not a URL: just us
    for (const api of [undefined, '', 'not a url']) {
      expect(parse(contentSecurityPolicy(api))['connect-src']).toEqual(["'self'"])
    }
  })

  it('lets avatars load from built-in images and https addresses only', () => {
    expect(parse(contentSecurityPolicy(undefined))['img-src']).toEqual([
      "'self'",
      'data:',
      'https:'
    ])
  })
})
