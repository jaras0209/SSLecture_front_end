/**
 * src/utils/api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * 集中式 API 請求工具
 *
 * 功能：
 *   1. 統一 base URL（從 VITE_API_BASE_URL 環境變數讀取）
 *   2. 自動注入 JWT Authorization header
 *   3. 統一錯誤格式解析（ApiError）
 *   4. 401 自動 Refresh Token 機制（後端就緒後啟用）
 *
 * 使用方式：
 *   import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api'
 *   const data = await apiGet<UserDTO>('/auth/me')
 *   const result = await apiPost<TokenDTO>('/auth/exchange', { code })
 *
 * TODO（後端就緒後）：
 *   1. 設定 .env 的 VITE_API_BASE_URL
 *   2. 啟用 refreshToken() 中的真實 fetch 呼叫
 *   3. 各 store 的 mock fetch 替換為此工具的 apiPost / apiPut 等
 */

import { safeGet, safeRemove } from '@/utils/storage'

// ─── 常數 ────────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

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
  options: { skipAuth?: boolean; isRetry?: boolean } = {}
): Promise<T> {
  const url = API_BASE + path
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (!options.skipAuth) {
    const token = getAccessToken()
    if (token) headers['Authorization'] = 'Bearer ' + token
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // 401 → 嘗試 refresh token 再重試一次
  if (res.status === 401 && !options.isRetry) {
    const refreshed = await ensureTokenRefreshed()
    if (refreshed) {
      return request<T>(method, path, body, { ...options, isRetry: true })
    }
    throw new ApiError(401, 'UNAUTHORIZED', '登入已過期，請重新登入')
  }

  let data: ApiResponse<T>
  try {
    data = await res.json()
  } catch {
    throw new ApiError(res.status, 'PARSE_ERROR', '伺服器回應格式錯誤')
  }

  if (!res.ok || !data.success) {
    throw new ApiError(
      res.status,
      data.error?.code ?? 'UNKNOWN',
      data.error?.message ?? 'HTTP ' + res.status
    )
  }

  return data.data
}

// ─── 公開 API 方法 ────────────────────────────────────────────────────────────

/** GET 請求 */
export function apiGet<T>(path: string, options?: { skipAuth?: boolean }): Promise<T> {
  return request<T>('GET', path, undefined, options)
}

/** POST 請求 */
export function apiPost<T>(path: string, body?: unknown, options?: { skipAuth?: boolean }): Promise<T> {
  return request<T>('POST', path, body, options)
}

/** PUT 請求 */
export function apiPut<T>(path: string, body?: unknown, options?: { skipAuth?: boolean }): Promise<T> {
  return request<T>('PUT', path, body, options)
}

/** PATCH 請求 */
export function apiPatch<T>(path: string, body?: unknown, options?: { skipAuth?: boolean }): Promise<T> {
  return request<T>('PATCH', path, body, options)
}

/** DELETE 請求 */
export function apiDelete<T>(path: string, options?: { skipAuth?: boolean }): Promise<T> {
  return request<T>('DELETE', path, undefined, options)
}
