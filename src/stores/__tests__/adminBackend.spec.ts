/**
 * The auth store's admin actions with the backend (docs/backend_api_spec.md section 8), against a
 * fake server: what is sent, and that the server's answer replaces what the browser keeps.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { setLocale, translate as t } from '@/i18n'

type Call = { path: string; method: string; body?: Record<string, unknown> }
const calls: Call[] = []
let routes: Record<string, (call: Call) => Response> = {}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const ok = (data: unknown) => json(200, { success: true, data })
const fail = (status: number, code: string) =>
  json(status, { success: false, error: { code, message: code } })

const account = (username: string, role: string, extra: object = {}) => ({
  id: username,
  username,
  role,
  church: role === 'admin' ? null : '愛與話語',
  displayName: null,
  realName: null,
  email: null,
  gender: null,
  avatarUrl: null,
  loginMethod: 'credentials',
  mustChangePassword: false,
  isActive: true,
  childUsernames: role === 'parent' ? [] : null,
  lastLoginAt: null,
  createdAt: '2026-11-01T00:00:00Z',
  ...extra
})
const NONE = { mentorAssignments: 0, lecturerLinks: 0, cancelledBookings: 0 }

describe('admin actions with the backend', () => {
  beforeEach(() => {
    localStorage.clear()
    calls.length = 0
    routes = {}
    vi.stubEnv('VITE_DEMO_MODE', 'false')
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    setLocale('zh-TW')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        const u = new URL(url, 'http://api.test')
        const call: Call = {
          path: u.pathname + u.search,
          method: init.method ?? 'GET',
          body: init.body ? JSON.parse(init.body as string) : undefined
        }
        calls.push(call)
        const handler = routes[`${call.method} ${u.pathname}`]
        return handler ? handler(call) : fail(404, 'NOT_FOUND')
      })
    )
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("replaces the browser's accounts with the server's, page by page", async () => {
    const page1 = Array.from({ length: 500 }, (_, i) => account(`s${i}`, 'student'))
    routes['GET /admin/users'] = (call) =>
      call.path.includes('page=1&')
        ? ok({ items: page1, total: 502, page: 1, pageSize: 500 })
        : ok({
            items: [
              account('mom', 'parent', { childUsernames: ['s1'] }),
              account('g.user', 'student', { loginMethod: 'google', gender: 'female' })
            ],
            total: 502,
            page: 2,
            pageSize: 500
          })
    const auth = useAuthStore()

    expect((await auth.loadAccounts()).success).toBe(true)

    expect(calls.map((c) => c.path)).toEqual([
      '/admin/users?page=1&pageSize=500',
      '/admin/users?page=2&pageSize=500'
    ])
    expect(Object.keys(auth.usersDb)).toHaveLength(502)
    // the demo's built-in accounts are gone
    expect(auth.usersDb['teacher']).toBeUndefined()
    expect(auth.usersDb['mom']).toMatchObject({ role: 'parent', childUsernames: ['s1'] })
    expect(auth.usersDb['g.user']).toMatchObject({ loginMethod: 'google', gender: 'female' })
    expect(auth.usersDb['s0'].passwordHash).toBe('')
  })

  it('reports a refused list (e.g. not an admin)', async () => {
    routes['GET /admin/users'] = () => fail(403, 'FORBIDDEN')
    const result = await useAuthStore().loadAccounts()
    expect(result).toEqual({ success: false, message: t('api.codes.FORBIDDEN') })
  })

  it('creates an account on the server', async () => {
    routes['POST /admin/users'] = (call) =>
      ok(account(call.body!.username as string, 'teacher', { mustChangePassword: true }))
    const auth = useAuthStore()
    const result = await auth.adminCreateAccount({
      username: ' new.teacher ',
      password: 'Temp-123',
      role: 'teacher',
      church: '愛與話語',
      email: ''
    })
    expect(result).toMatchObject({ success: true, username: 'new.teacher' })
    expect(calls[0].body).toEqual({
      username: 'new.teacher',
      password: 'Temp-123',
      role: 'teacher',
      church: '愛與話語'
    })
    expect(auth.usersDb['new.teacher']).toMatchObject({ role: 'teacher', mustChangePassword: true })
  })

  it("reports the server's reason, e.g. a taken name", async () => {
    routes['POST /admin/users'] = () => fail(409, 'USERNAME_TAKEN')
    const result = await useAuthStore().adminCreateAccount({
      username: 'student',
      password: 'x',
      role: 'student'
    })
    expect(result).toEqual({ success: false, message: t('api.codes.USERNAME_TAKEN') })
  })

  it('changes a role and returns what the server cleaned up', async () => {
    const cleanup = { mentorAssignments: 2, lecturerLinks: 0, cancelledBookings: 1 }
    routes['PUT /admin/users/lin.teacher'] = () =>
      ok({ user: account('lin.teacher', 'pastor'), cleanup })
    const auth = useAuthStore()
    const result = await auth.adminUpdateAccount('lin.teacher', { role: 'pastor' })
    expect(result).toMatchObject({ success: true, cleanup })
    expect(calls[0]).toMatchObject({ method: 'PUT', body: { role: 'pastor' } })
    expect(auth.usersDb['lin.teacher'].role).toBe('pastor')
  })

  it('resets a password to a new random one and returns it once', async () => {
    routes['PUT /admin/users/student'] = () =>
      ok({ user: account('student', 'student', { mustChangePassword: true }), cleanup: NONE })
    const auth = useAuthStore()
    const first = await auth.adminResetPasswordOnServer('student')
    const second = await auth.adminResetPasswordOnServer('student')
    expect(first.success).toBe(true)
    expect(first.password).toMatch(/^[A-Za-z0-9]{10}$/)
    expect(calls[0].body).toEqual({ password: first.password })
    expect(second.password).not.toBe(first.password)
    expect(auth.usersDb['student'].mustChangePassword).toBe(true)
  })

  it('deletes on the server; the name stays taken here too', async () => {
    const cleanup = { mentorAssignments: 1, lecturerLinks: 1, cancelledBookings: 0 }
    routes['DELETE /admin/users/teacher'] = () => ok({ username: 'teacher', cleanup })
    const auth = useAuthStore()
    const result = await auth.adminDeleteAccount('teacher')
    expect(result).toMatchObject({ success: true, cleanup })
    expect(auth.usersDb['teacher']).toBeUndefined()
    expect(auth.isUsernameTaken('teacher')).toBe(true)
  })

  it('loads, generates and revokes invite codes on the server', async () => {
    let codes = [
      {
        code: 'SS-STU-ABCD2345',
        role: 'student',
        church: '愛與話語',
        createdBy: 'admin',
        createdAt: '2026-11-20T00:00:00Z',
        expiresAt: '2026-11-27T00:00:00Z',
        usedBy: null,
        usedAt: null,
        revoked: false
      }
    ]
    routes['GET /admin/invite-codes'] = () => ok(codes)
    routes['POST /admin/invite-codes'] = () => {
      codes = [{ ...codes[0], code: 'SS-TCH-WXYZ6789', role: 'teacher' }, ...codes]
      return ok({ code: 'SS-TCH-WXYZ6789', expiresAt: '2026-11-29T00:00:00Z' })
    }
    routes['DELETE /admin/invite-codes/SS-STU-ABCD2345'] = () =>
      fail(400, 'INVITE_CODE_ALREADY_USED')
    const auth = useAuthStore()

    await auth.loadInviteCodes()
    expect(auth.getInviteCodes().map((c) => c.code)).toEqual(['SS-STU-ABCD2345'])

    const made = await auth.adminGenerateInviteCode('teacher', '愛與話語', 3)
    expect(made).toMatchObject({ success: true, code: 'SS-TCH-WXYZ6789' })
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      role: 'teacher',
      church: '愛與話語',
      expiryDays: 3
    })
    expect(auth.inviteCodesDb['SS-TCH-WXYZ6789']).toBeTruthy()

    const revoked = await auth.adminRevokeInviteCode('SS-STU-ABCD2345')
    expect(revoked).toEqual({ success: false, message: t('api.codes.INVITE_CODE_ALREADY_USED') })
  })
})
