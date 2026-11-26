/**
 * The auth store with the backend (VITE_DEMO_MODE=false and VITE_API_BASE_URL set): sign-in,
 * registration, sign-out, password, profile and the Token refresh, against a fake server that
 * answers like SSLecture_backend (docs/backend_api_spec.md section 2).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { onSessionExpired } from '@/utils/api'
import { sessionMeta } from '@/utils/session'
import { setLocale, translate as t } from '@/i18n'

type Call = { path: string; method: string; body?: Record<string, unknown>; auth?: string }

const calls: Call[] = []
let routes: Record<string, (call: Call) => Response> = {}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  })
const ok = (data: unknown) => json(200, { success: true, data })
const fail = (status: number, code: string, message = code) =>
  json(status, { success: false, error: { code, message } })

const ME = {
  id: '6f1c2c43-0000-4000-8000-000000000001',
  username: 'student',
  role: 'student',
  church: '愛與話語',
  displayName: 'SS學員',
  realName: null,
  email: null,
  gender: 'male',
  avatarUrl: null,
  loginMethod: 'credentials',
  mustChangePassword: false,
  childUsernames: [],
  lastLoginAt: '2026-11-26T04:00:00Z',
  createdAt: '2026-11-01T00:00:00Z'
}
const TOKENS = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 3600 }

function serve() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const path = url.replace(/^https?:\/\/[^/]+/, '')
      const headers = (init.headers ?? {}) as Record<string, string>
      const call: Call = {
        path,
        method: init.method ?? 'GET',
        body: init.body ? JSON.parse(init.body as string) : undefined,
        auth: headers['Authorization']
      }
      calls.push(call)
      const handler = routes[`${call.method} ${path}`]
      return handler ? handler(call) : fail(404, 'NOT_FOUND')
    })
  )
}

const token = (key: 'access' | 'refresh') =>
  JSON.parse(localStorage.getItem(`superstart_${key}_token`) ?? 'null')

describe('auth store with the backend', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    calls.length = 0
    routes = {}
    vi.stubEnv('VITE_DEMO_MODE', 'false')
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    setLocale('zh-TW')
    serve()
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('signs in: keeps the tokens, takes the account from GET /auth/me, starts the session', async () => {
    routes['POST /auth/login'] = () => ok({ ...TOKENS, user: { username: 'student' } })
    routes['GET /auth/me'] = () => ok(ME)
    const auth = useAuthStore()

    const result = await auth.signIn(' student ', '123456', true)

    expect(result).toEqual({ success: true, message: t('stores.auth.loginSuccess') })
    expect(calls[0]).toMatchObject({
      path: '/auth/login',
      body: { identifier: 'student', password: '123456', rememberMe: true },
      auth: undefined
    })
    expect(calls[1]).toMatchObject({ path: '/auth/me', auth: 'Bearer access-1' })
    expect(auth.currentUser).toMatchObject({
      username: 'student',
      role: 'student',
      church: '愛與話語',
      gender: 'male',
      loginMethod: 'credentials'
    })
    expect(auth.currentUser?.avatarUrl).toBeTruthy()
    expect(token('access')).toBe('access-1')
    expect(token('refresh')).toBe('refresh-1')
    expect(sessionMeta()?.remember).toBe(true)
    // The demo's account list is not used
    expect(auth.usersDb['student']?.lastLoginAt).toBeUndefined()
  })

  it('says when an admin-set password must be changed first', async () => {
    routes['POST /auth/login'] = () => ok(TOKENS)
    routes['GET /auth/me'] = () => ok({ ...ME, mustChangePassword: true })
    const auth = useAuthStore()
    const result = await auth.signIn('student', '123456')
    expect(result.message).toBe(t('stores.auth.loginMustChangePassword'))
    expect(auth.currentUser?.mustChangePassword).toBe(true)
  })

  it('reports a wrong password as the server says, without trying to refresh a token', async () => {
    routes['POST /auth/login'] = () => fail(401, 'INVALID_CREDENTIALS', 'Bad credentials')
    const auth = useAuthStore()
    const result = await auth.signIn('student', 'wrong')
    expect(result).toEqual({ success: false, message: t('api.codes.INVALID_CREDENTIALS') })
    expect(calls.map((c) => c.path)).toEqual(['/auth/login'])
    expect(auth.currentUser).toBeNull()
    expect(token('access')).toBeNull()
  })

  it('says how long to wait after too many attempts', async () => {
    routes['POST /auth/login'] = () =>
      json(
        429,
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: '' } },
        {
          'Retry-After': '600'
        }
      )
    const result = await useAuthStore().signIn('student', 'wrong')
    expect(result).toEqual({
      success: false,
      message: t('api.errors.tooManyRequestsIn', { minutes: 10 })
    })
  })

  it('registers, then signs in with the new account', async () => {
    routes['POST /auth/register'] = () =>
      ok({ user: { id: 'x', username: 'new.user', role: 'teacher', church: '主大明' } })
    routes['POST /auth/login'] = () => ok(TOKENS)
    routes['GET /auth/me'] = () =>
      ok({ ...ME, username: 'new.user', role: 'teacher', church: '主大明' })
    const auth = useAuthStore()

    const result = await auth.signUp({
      username: 'new.user',
      password: 'Abc123!',
      church: '愛與話語',
      email: '',
      inviteCode: 'SS-TCH-ABCD2345'
    })

    expect(result).toEqual({ success: true, message: t('stores.auth.registerSuccess') })
    expect(calls[0].body).toEqual({
      username: 'new.user',
      password: 'Abc123!',
      church: '愛與話語',
      inviteCode: 'SS-TCH-ABCD2345'
    })
    // The server decided the role and church from the invite code
    expect(auth.currentUser).toMatchObject({
      username: 'new.user',
      role: 'teacher',
      church: '主大明'
    })
    expect(sessionMeta()?.remember).toBe(false)
  })

  it('reports a wrong invite code and stays signed out', async () => {
    routes['POST /auth/register'] = () => fail(400, 'INVALID_INVITE_CODE')
    const auth = useAuthStore()
    const result = await auth.signUp({ username: 'x.y.z', password: 'Abc123!', inviteCode: 'NOPE' })
    expect(result).toEqual({ success: false, message: t('api.codes.INVALID_INVITE_CODE') })
    expect(auth.currentUser).toBeNull()
  })

  it('signs out on the server with the token, and forgets the tokens here', async () => {
    routes['POST /auth/login'] = () => ok(TOKENS)
    routes['GET /auth/me'] = () => ok(ME)
    routes['POST /auth/logout'] = () => ok(null)
    const auth = useAuthStore()
    await auth.signIn('student', '123456')

    await auth.signOut()

    expect(calls.at(-1)).toMatchObject({ path: '/auth/logout', auth: 'Bearer access-1' })
    expect(auth.currentUser).toBeNull()
    expect(token('access')).toBeNull()
    expect(token('refresh')).toBeNull()
  })

  it('signs out here even when the server cannot be reached', async () => {
    routes['POST /auth/login'] = () => ok(TOKENS)
    routes['GET /auth/me'] = () => ok(ME)
    const auth = useAuthStore()
    await auth.signIn('student', '123456')
    routes['POST /auth/logout'] = () => {
      throw new TypeError('Failed to fetch')
    }
    await auth.signOut()
    expect(auth.currentUser).toBeNull()
    expect(token('refresh')).toBeNull()
  })

  it('refreshes an expired access token once and repeats the request', async () => {
    localStorage.setItem('superstart_access_token', JSON.stringify('old'))
    localStorage.setItem('superstart_refresh_token', JSON.stringify('refresh-1'))
    routes['GET /auth/me'] = (call) =>
      call.auth === 'Bearer access-2' ? ok(ME) : fail(401, 'TOKEN_EXPIRED')
    routes['POST /auth/refresh'] = () =>
      ok({ accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 3600 })
    localStorage.setItem(
      'superstart_user',
      JSON.stringify({ username: 'student', role: 'student' })
    )
    const auth = useAuthStore()

    await auth.refreshCurrentUser()

    expect(calls.map((c) => c.path)).toEqual(['/auth/me', '/auth/refresh', '/auth/me'])
    expect(calls[1].body).toEqual({ refreshToken: 'refresh-1' })
    expect(token('access')).toBe('access-2')
    expect(token('refresh')).toBe('refresh-2')
    expect(auth.currentUser?.church).toBe('愛與話語')
  })

  it('ends the sign-in when the server will not renew it', async () => {
    localStorage.setItem('superstart_access_token', JSON.stringify('old'))
    localStorage.setItem('superstart_refresh_token', JSON.stringify('refresh-1'))
    localStorage.setItem(
      'superstart_user',
      JSON.stringify({ username: 'student', role: 'student' })
    )
    routes['GET /auth/me'] = () => fail(401, 'TOKEN_EXPIRED')
    routes['POST /auth/refresh'] = () => fail(401, 'REFRESH_TOKEN_EXPIRED')
    const expired = vi.fn()
    const stop = onSessionExpired(expired)
    const auth = useAuthStore()

    await auth.refreshCurrentUser()

    expect(expired).toHaveBeenCalledOnce()
    expect(token('access')).toBeNull()
    expect(token('refresh')).toBeNull()
    stop()
  })

  it('keeps the sign-in when the server is only unreachable', async () => {
    localStorage.setItem('superstart_access_token', JSON.stringify('old'))
    localStorage.setItem('superstart_refresh_token', JSON.stringify('refresh-1'))
    localStorage.setItem(
      'superstart_user',
      JSON.stringify({ username: 'student', role: 'student' })
    )
    routes['GET /auth/me'] = () => fail(401, 'TOKEN_EXPIRED')
    routes['POST /auth/refresh'] = () => {
      throw new TypeError('Failed to fetch')
    }
    const expired = vi.fn()
    const stop = onSessionExpired(expired)
    const auth = useAuthStore()

    await auth.refreshCurrentUser()

    expect(expired).not.toHaveBeenCalled()
    expect(token('refresh')).toBe('refresh-1')
    expect(auth.currentUser?.username).toBe('student')
    stop()
  })

  it('changes the own password on the server', async () => {
    routes['POST /auth/login'] = () => ok(TOKENS)
    routes['GET /auth/me'] = () => ok({ ...ME, mustChangePassword: true })
    const auth = useAuthStore()
    await auth.signIn('student', '123456')
    routes['POST /auth/reset-password'] = () => ok(null)
    routes['GET /auth/me'] = () => ok(ME)

    const result = await auth.changeOwnPassword('123456', 'Abc123!')

    expect(result).toEqual({ success: true, message: t('stores.auth.passwordChanged') })
    expect(calls.find((c) => c.path === '/auth/reset-password')?.body).toEqual({
      oldPassword: '123456',
      newPassword: 'Abc123!'
    })
    expect(auth.currentUser?.mustChangePassword).toBeUndefined()
  })

  it('reports a wrong current password', async () => {
    routes['POST /auth/login'] = () => ok(TOKENS)
    routes['GET /auth/me'] = () => ok(ME)
    const auth = useAuthStore()
    await auth.signIn('student', '123456')
    routes['POST /auth/reset-password'] = () =>
      fail(400, 'VALIDATION_ERROR', 'oldPassword：目前密碼不正確')
    const result = await auth.changeOwnPassword('nope', 'Abc123!')
    expect(result).toEqual({ success: false, message: 'oldPassword：目前密碼不正確' })
  })

  it('saves the profile on the server and shows what it saved', async () => {
    routes['POST /auth/login'] = () => ok(TOKENS)
    routes['GET /auth/me'] = () => ok(ME)
    const auth = useAuthStore()
    await auth.signIn('student', '123456')
    routes['PATCH /auth/me'] = (call) => ok({ ...ME, ...call.body, email: 'me@example.tw' })

    const result = await auth.saveProfile({ displayName: '小明', email: 'Me@Example.TW' })

    expect(result).toEqual({ success: true, message: t('stores.auth.profileUpdated') })
    expect(auth.currentUser).toMatchObject({ displayName: '小明', email: 'me@example.tw' })
  })

  it('refuses an avatar address that is not https before asking the server', async () => {
    routes['POST /auth/login'] = () => ok(TOKENS)
    routes['GET /auth/me'] = () => ok(ME)
    const auth = useAuthStore()
    await auth.signIn('student', '123456')
    const before = calls.length
    const result = await auth.saveProfile({ avatarUrl: 'http://example.tw/a.png' })
    expect(result.success).toBe(false)
    expect(calls.length).toBe(before)
  })

  it('does not resume a sign-in whose tokens are gone', () => {
    localStorage.setItem(
      'superstart_user',
      JSON.stringify({ username: 'student', role: 'student' })
    )
    expect(useAuthStore().currentUser).toBeNull()
    expect(localStorage.getItem('superstart_user')).toBeNull()
  })
})

describe('auth store in the demo (no backend)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    vi.stubGlobal('fetch', vi.fn())
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('uses the accounts kept in the browser and never calls a server', async () => {
    const auth = useAuthStore()
    expect((await auth.signIn('student', '123456')).success).toBe(true)
    expect((await auth.changeOwnPassword('123456', 'Abc123!')).success).toBe(true)
    expect((await auth.saveProfile({ displayName: '小明' })).success).toBe(true)
    await auth.refreshCurrentUser()
    await auth.signOut()
    expect(auth.currentUser).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})
