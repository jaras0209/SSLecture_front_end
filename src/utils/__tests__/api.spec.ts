import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apiGet, apiPost, apiDelete, ApiError, DEFAULT_TIMEOUT_MS } from '@/utils/api'
import { setLocale } from '@/i18n'

type FetchArgs = [url: string, init: RequestInit]

const fetchMock = vi.fn<(...args: FetchArgs) => Promise<Response>>()

function respond(status: number, body: string, contentType = 'application/json') {
  fetchMock.mockResolvedValueOnce(
    new Response(status === 204 ? null : body, { status, headers: { 'Content-Type': contentType } })
  )
}

/** A fetch that only settles when its signal aborts (to exercise timeouts / cancellation) */
function hangUntilAborted() {
  fetchMock.mockImplementationOnce(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        )
      })
  )
}

async function catchError(p: Promise<unknown>): Promise<unknown> {
  try {
    await p
  } catch (e) {
    return e
  }
  throw new Error('expected the request to fail')
}

describe('api request helpers', () => {
  beforeEach(async () => {
    localStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await setLocale('zh-TW')
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
    await setLocale('zh-TW')
  })

  // ── success & headers ──────────────────────────────────────────────────────

  it('returns data on success', async () => {
    respond(200, JSON.stringify({ success: true, data: { id: 1 } }))
    await expect(apiGet<{ id: number }>('/x')).resolves.toEqual({ id: 1 })
  })

  it('sends Content-Type only when there is a body', async () => {
    respond(200, JSON.stringify({ success: true, data: null }))
    respond(200, JSON.stringify({ success: true, data: null }))
    await apiGet('/x')
    await apiPost('/x', { a: 1 })

    const [, getInit] = fetchMock.mock.calls[0]
    const [, postInit] = fetchMock.mock.calls[1]
    expect(getInit.headers).toEqual({ Accept: 'application/json' })
    expect(postInit.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json'
    })
    expect(postInit.body).toBe('{"a":1}')
  })

  it('adds the bearer token unless skipAuth is set', async () => {
    localStorage.setItem('superstart_access_token', JSON.stringify('tok123'))
    respond(200, JSON.stringify({ success: true, data: null }))
    respond(200, JSON.stringify({ success: true, data: null }))
    await apiGet('/x')
    await apiGet('/x', { skipAuth: true })

    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBe(
      'Bearer tok123'
    )
    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty('Authorization')
  })

  // ── empty bodies ───────────────────────────────────────────────────────────

  it('returns undefined for 204 No Content', async () => {
    respond(204, '')
    await expect(apiDelete<void>('/lecturers/l1')).resolves.toBeUndefined()
  })

  it('returns undefined for { success: true } without data', async () => {
    respond(200, JSON.stringify({ success: true }))
    await expect(apiDelete<void>('/x')).resolves.toBeUndefined()
  })

  it('reports an empty error response as an HTTP error', async () => {
    respond(500, '')
    const err = (await catchError(apiGet('/x'))) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 500, code: 'HTTP_500', message: '伺服器錯誤（HTTP 500）' })
  })

  // ── error bodies ───────────────────────────────────────────────────────────

  it("uses the backend's error code and message", async () => {
    respond(
      409,
      JSON.stringify({ success: false, error: { code: 'USERNAME_TAKEN', message: '帳號已被使用' } })
    )
    await expect(apiPost('/x', {})).rejects.toMatchObject({
      status: 409,
      code: 'USERNAME_TAKEN',
      message: '帳號已被使用'
    })
  })

  it('fills in a missing error code or message', async () => {
    respond(400, JSON.stringify({ success: false, error: { message: '欄位錯誤' } }))
    await expect(apiPost('/x', {})).rejects.toMatchObject({ code: 'HTTP_400', message: '欄位錯誤' })
  })

  it('treats success: false on a 200 as UNKNOWN', async () => {
    respond(200, JSON.stringify({ success: false }))
    await expect(apiGet('/x')).rejects.toMatchObject({ status: 200, code: 'UNKNOWN' })
  })

  it('reports a non-JSON error page (e.g. proxy 502 HTML) as an HTTP error', async () => {
    respond(502, '<html><body>Bad Gateway</body></html>', 'text/html')
    await expect(apiGet('/x')).rejects.toMatchObject({ status: 502, code: 'HTTP_502' })
  })

  it('reports unparseable or non-object success bodies as PARSE_ERROR', async () => {
    respond(200, 'not json', 'text/plain')
    respond(200, 'null')
    await expect(apiGet('/x')).rejects.toMatchObject({
      code: 'PARSE_ERROR',
      message: '伺服器回應格式錯誤'
    })
    await expect(apiGet('/x')).rejects.toMatchObject({ code: 'PARSE_ERROR' })
  })

  it('maps 401 to UNAUTHORIZED when the token cannot be refreshed', async () => {
    respond(401, JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'x' } }))
    await expect(apiGet('/x')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
      message: '登入已過期，請重新登入'
    })
  })

  // ── network, timeout, cancellation ─────────────────────────────────────────

  it('maps a failed connection to NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(apiGet('/x')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: '無法連線到伺服器，請檢查網路連線'
    })
  })

  it('times out after DEFAULT_TIMEOUT_MS', async () => {
    vi.useFakeTimers()
    hangUntilAborted()
    const p = catchError(apiGet('/slow'))
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS - 1)
    expect(fetchMock.mock.calls[0][1].signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await p).toMatchObject({ code: 'TIMEOUT', message: '伺服器回應逾時，請稍後再試' })
  })

  it('honours a custom timeoutMs, and timeoutMs: 0 disables the timeout', async () => {
    vi.useFakeTimers()
    hangUntilAborted()
    const quick = catchError(apiGet('/x', { timeoutMs: 100 }))
    await vi.advanceTimersByTimeAsync(100)
    expect(await quick).toMatchObject({ code: 'TIMEOUT' })

    hangUntilAborted()
    void apiGet('/x', { timeoutMs: 0 }).catch(() => {})
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS * 10)
    expect(fetchMock.mock.calls[1][1].signal?.aborted).toBe(false)
  })

  it('times out while reading a slow response body', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementationOnce(async (_url, init) => {
      const body = new ReadableStream({
        start(controller) {
          init.signal?.addEventListener('abort', () =>
            controller.error(new DOMException('The operation was aborted.', 'AbortError'))
          )
        }
      })
      return new Response(body, { status: 200 })
    })
    const p = catchError(apiGet('/x', { timeoutMs: 50 }))
    await vi.advanceTimersByTimeAsync(50)
    expect(await p).toMatchObject({ code: 'TIMEOUT' })
  })

  it('rethrows the AbortError when the caller cancels', async () => {
    hangUntilAborted()
    const ctrl = new AbortController()
    const p = catchError(apiGet('/x', { signal: ctrl.signal }))
    ctrl.abort()
    const err = await p
    expect(err).not.toBeInstanceOf(ApiError)
    expect((err as DOMException).name).toBe('AbortError')
  })

  it('does not send at all when the signal is already aborted', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const err = await catchError(apiGet('/x', { signal: ctrl.signal }))
    expect((err as DOMException).name).toBe('AbortError')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // ── i18n ───────────────────────────────────────────────────────────────────

  it('translates frontend-generated messages into the current locale', async () => {
    await setLocale('en')
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    respond(503, '')
    await expect(apiGet('/x')).rejects.toMatchObject({
      message: 'Unable to reach the server. Please check your connection.'
    })
    await expect(apiGet('/x')).rejects.toMatchObject({ message: 'Server error (HTTP 503)' })
  })
})
