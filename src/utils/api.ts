/**
 * src/utils/api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * 集中式 API 請求工具
 *
 * 功能：
 *   1. 統一 base URL（從 VITE_API_BASE_URL 環境變數讀取）
 *   2. 自動注入 JWT Authorization header
 *   3. 統一錯誤格式解析（ApiError），前端產生的錯誤訊息走 i18n
 *   4. 401 自動 Refresh Token 機制（後端就緒後啟用）
 *   5. 逾時（預設 DEFAULT_TIMEOUT_MS）與呼叫端取消（AbortSignal）
 *   6. 204 No Content / 空 body 回傳 undefined
 *
 * 使用方式：
 *   import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api'
 *   const data = await apiGet<UserDTO>('/auth/me')
 *   const result = await apiPost<TokenDTO>('/auth/exchange', { code })
 *   await apiDelete<void>('/lecturers/l1')                      // 無回傳資料
 *   await apiGet<Report>('/stats', { timeoutMs: 60_000 })       // 較慢的請求
 *   await apiGet<Course[]>('/courses', { signal: ctrl.signal }) // 元件卸載時取消
 *
 * 錯誤碼（ApiError.code）：
 *   後端回傳的 error.code，或前端產生的 UNAUTHORIZED / TIMEOUT / NETWORK_ERROR /
 *   PARSE_ERROR / HTTP_<status>。呼叫端自行取消時拋出原本的 AbortError（非 ApiError）。
 *
 * TODO（後端就緒後）：
 *   1. 設定 .env 的 VITE_API_BASE_URL
 *   2. 啟用 refreshToken() 中的真實 fetch 呼叫
 *   3. 各 store 的 mock fetch 替換為此工具的 apiPost / apiPut 等
 */

import { safeGet, safeRemove } from '@/utils/storage'
import { i18n } from '@/i18n'

// ─── 常數 ────────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

/** 預設逾時（毫秒）：從送出請求到讀完回應內容 */
export const DEFAULT_TIMEOUT_MS = 15_000

// 在呼叫時才翻譯（i18n 已就緒），跟隨目前語系
const t = (key: string, values?: Record<string, unknown>): string =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (i18n.global.t as any)(key, values ?? {}) as string

// ─── 型別 ────────────────────────────────────────────────────────────────────

/** 後端統一回應格式 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  error?: {
    code: string
    message: string
  }
}

/** 各請求方法共用的選項 */
export interface RequestOptions {
  /** 不帶 Authorization header（登入、換 token 等公開 API） */
  skipAuth?: boolean
  /** 逾時毫秒數，預設 DEFAULT_TIMEOUT_MS；0 表示不設逾時 */
  timeoutMs?: number
  /** 呼叫端取消請求（例如元件卸載時）；取消時拋出原本的 AbortError */
  signal?: AbortSignal
}

/** API 呼叫失敗時拋出的錯誤 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

// ─── Token 管理 ───────────────────────────────────────────────────────────────

/** 從 localStorage 讀取 Access Token */
function getAccessToken(): string {
  return safeGet<string>('superstart_access_token', '')
}

/** 清除所有 Token（登出時使用） */
export function clearTokens(): void {
  safeRemove('superstart_access_token')
  safeRemove('superstart_refresh_token')
}

// ─── Refresh Token 機制 ───────────────────────────────────────────────────────

let _isRefreshing = false
let _refreshPromise: Promise<boolean> | null = null

/**
 * 呼叫後端換取新 Access Token。
 * TODO（後端就緒後）：取消以下 fetch 呼叫的註解，移除 mock。
 */
async function refreshToken(): Promise<boolean> {
  // === 後端就緒後取消此區塊的註解 ===
  // const rt = safeGet<string>('superstart_refresh_token', '')
  // if (!rt) return false
  // try {
  //   const res = await fetch(API_BASE + '/auth/refresh', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ refreshToken: rt })
  //   })
  //   if (!res.ok) { clearTokens(); return false }
  //   const data = await res.json()
  //   safeSet('superstart_access_token', data.data.accessToken)
  //   safeSet('superstart_refresh_token', data.data.refreshToken)
  //   return true
  // } catch {
  //   clearTokens()
  //   return false
  // }

  // === 開發期 mock（後端就緒後移除）===
  console.warn('[API] refreshToken: 後端就緒前不支援 token refresh')
  return false
}

async function ensureTokenRefreshed(): Promise<boolean> {
  if (_isRefreshing && _refreshPromise) return _refreshPromise
  _isRefreshing = true
  _refreshPromise = refreshToken().finally(() => {
    _isRefreshing = false
    _refreshPromise = null
  })
  return _refreshPromise
}

// ─── 核心 Fetch ───────────────────────────────────────────────────────────────

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions & { isRetry?: boolean } = {}
): Promise<T> {
  const url = API_BASE + path
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (!options.skipAuth) {
    const token = getAccessToken()
    if (token) headers['Authorization'] = 'Bearer ' + token
  }

  const { res, text } = await send(
    url,
    { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined },
    options
  )

  // 401 → 嘗試 refresh token 再重試一次
  if (res.status === 401 && !options.isRetry) {
    const refreshed = await ensureTokenRefreshed()
    if (refreshed) {
      return request<T>(method, path, body, { ...options, isRetry: true })
    }
    throw new ApiError(401, 'UNAUTHORIZED', t('api.errors.unauthorized'))
  }

  return parseResponse<T>(res, text)
}

/**
 * 送出請求並讀完回應內容。逾時涵蓋整段（含讀取 body），
 * 逾時 → TIMEOUT、連線失敗 → NETWORK_ERROR；呼叫端取消則拋出原本的 AbortError。
 */
async function send(
  url: string,
  init: RequestInit,
  { timeoutMs = DEFAULT_TIMEOUT_MS, signal }: RequestOptions
): Promise<{ res: Response; text: string }> {
  // Already cancelled by the caller: don't send at all
  signal?.throwIfAborted()

  const controller = new AbortController()
  let timedOut = false
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true
          controller.abort()
        }, timeoutMs)
      : null
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort, { once: true })

  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    const text = await res.text()
    return { res, text }
  } catch (err) {
    if (timedOut) throw new ApiError(0, 'TIMEOUT', t('api.errors.timeout'))
    if (signal?.aborted) throw err
    throw new ApiError(0, 'NETWORK_ERROR', t('api.errors.network'))
  } finally {
    if (timer !== null) clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}

/** 解析後端統一回應格式；空 body（如 204）成功時回傳 undefined。 */
function parseResponse<T>(res: Response, text: string): T {
  const httpError = () =>
    new ApiError(res.status, `HTTP_${res.status}`, t('api.errors.http', { status: res.status }))

  if (text.trim() === '') {
    if (res.ok) return undefined as T
    throw httpError()
  }

  let data: ApiResponse<T>
  try {
    data = JSON.parse(text)
  } catch {
    data = null as unknown as ApiResponse<T>
  }
  if (typeof data !== 'object' || data === null) {
    // 非 JSON（或非物件）的回應，例如反向代理回傳的 502 HTML 錯誤頁，視為 HTTP 錯誤
    if (!res.ok) throw httpError()
    throw new ApiError(res.status, 'PARSE_ERROR', t('api.errors.parse'))
  }

  if (!res.ok || !data.success) {
    // 優先使用後端提供的 code / message，缺的部分用前端預設值補上
    const fallback = res.ok
      ? new ApiError(res.status, 'UNKNOWN', t('api.errors.parse'))
      : httpError()
    throw new ApiError(
      res.status,
      data.error?.code ?? fallback.code,
      data.error?.message ?? fallback.message
    )
  }

  return data.data
}

// ─── 公開 API 方法 ────────────────────────────────────────────────────────────

/** GET 請求 */
export function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>('GET', path, undefined, options)
}

/** POST 請求 */
export function apiPost<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>('POST', path, body, options)
}

/** PUT 請求 */
export function apiPut<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>('PUT', path, body, options)
}

/** PATCH 請求 */
export function apiPatch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>('PATCH', path, body, options)
}

/** DELETE 請求 */
export function apiDelete<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>('DELETE', path, undefined, options)
}
