import { describe, it, expect } from 'vitest'
import {
  normalizeUsername,
  normalizeEmail,
  usernameProblem,
  isValidEmail,
  USERNAME_MAX
} from '@/utils/account'

describe('account rules', () => {
  it('stores usernames and emails trimmed and in lower case', () => {
    expect(normalizeUsername('  Amy.Lin ')).toBe('amy.lin')
    expect(normalizeEmail(' Amy@Example.COM ')).toBe('amy@example.com')
  })

  it.each([
    ['amy', undefined],
    ['a.b_c-9', undefined],
    ['x'.repeat(USERNAME_MAX), undefined],
    ['ab', 'account.usernameLength'],
    ['x'.repeat(USERNAME_MAX + 1), 'account.usernameLength'],
    ['amy lin', 'account.usernameChars'],
    ['amy@home', 'account.usernameChars'],
    ['小明同學', 'account.usernameChars']
  ])('%j → %s', (username, problem) => {
    expect(usernameProblem(username)).toBe(problem)
  })

  it.each([
    ['amy@example.com', true],
    ['a.b+c@church.org.tw', true],
    ['amy@example', false],
    ['amy example.com', false],
    ['@example.com', false],
    ['amy@@example.com', false]
  ])('email %j valid: %s', (email, valid) => {
    expect(isValidEmail(email)).toBe(valid)
  })
})
