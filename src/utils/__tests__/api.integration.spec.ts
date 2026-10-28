// @vitest-environment node
/**
 * Exercises api.ts against a real local HTTP server with Node's built-in fetch,
 * so timeout / abort / empty-body handling is checked against real network
 * behaviour rather than a mocked fetch.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

let server: http.Server
let base = ''

const routes: Record<string, (res: http.ServerResponse) => void> = {
  '/ok': (res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true, data: { n: 1 } }))
  },
  '/no-content': (res) => {
    res.writeHead(204)
    res.end()
  },
  '/bad-gateway': (res) => {
    res.writeHead(502, { 'Content-Type': 'text/html' })
    res.end('<html><body>502 Bad Gateway</body></html>')
  },
  // never sends headers
  '/hang': () => {},
  // sends headers and part of the body, then stalls
  '/stall-body': (res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.write('{"success": true, "da')
  }
}

beforeAll(async () => {
  // No localStorage in the node environment: safeGet falls back (and warns) — expected here
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  server = http.createServer((req, res) => (routes[req.url ?? ''] ?? routes['/ok'])(res))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

/** api.ts reads VITE_API_BASE_URL at import time, so load a fresh copy per base URL */
async function loadApi(baseUrl = base) {
  vi.stubEnv('VITE_API_BASE_URL', baseUrl)
  vi.resetModules()
  return import('@/utils/api')
}
const api = () => loadApi()

describe('api.ts against a real HTTP server', () => {
  it('returns data', async () => {
    const { apiGet } = await api()
    await expect(apiGet('/ok')).resolves.toEqual({ n: 1 })
  })

  it('returns undefined for 204', async () => {
    const { apiDelete } = await api()
    await expect(apiDelete<void>('/no-content')).resolves.toBeUndefined()
  })

  it('reports an HTML 502 page as HTTP_502', async () => {
    const { apiGet } = await api()
    await expect(apiGet('/bad-gateway')).rejects.toMatchObject({ status: 502, code: 'HTTP_502' })
  })

  it('times out when the server never responds', async () => {
    const { apiGet } = await api()
    await expect(apiGet('/hang', { timeoutMs: 150 })).rejects.toMatchObject({ code: 'TIMEOUT' })
  })

  it('times out when the body stalls after the headers', async () => {
    const { apiGet } = await api()
    await expect(apiGet('/stall-body', { timeoutMs: 150 })).rejects.toMatchObject({
      code: 'TIMEOUT'
    })
  })

  it('rethrows AbortError when the caller cancels', async () => {
    const { apiGet, ApiError } = await api()
    const ctrl = new AbortController()
    const p = apiGet('/hang', { signal: ctrl.signal })
    setTimeout(() => ctrl.abort(), 50)
    const err = await p.catch((e: unknown) => e)
    expect(err).not.toBeInstanceOf(ApiError)
    expect((err as Error).name).toBe('AbortError')
  })

  it('reports an unreachable server as NETWORK_ERROR', async () => {
    // Grab a free port, then close it so nothing is listening there
    const closed = http.createServer()
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve))
    const port = (closed.address() as AddressInfo).port
    await new Promise<void>((resolve) => closed.close(() => resolve()))

    const { apiGet } = await loadApi(`http://127.0.0.1:${port}`)
    await expect(apiGet('/ok')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
})
