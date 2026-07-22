/**
 * @file storage.ts
 * @description 安全的 localStorage 讀寫工具。
 *
 * 所有操作均不 throw，失敗時僅 console.warn 並回傳 fallback，
 * 避免因手動改壞 localStorage 而導致 app 崩潰。
 *
 * @example
 *   // 讀取，失敗時回傳空物件
 *   const db = safeGet<UserDb>('my_db', {})
 *
 *   // 讀取，並在損壞時自動清除該 key
 *   const user = safeGet<User | null>('current_user', null, { clearOnError: true })
 *
 *   // 寫入（回傳是否成功）
 *   const ok = safeSet('my_db', db)
 */

export interface SafeGetOptions {
  /**
   * 若 JSON.parse 失敗，是否自動 removeItem 該 key。
   * 適用於不應出現損壞資料的核心狀態（如目前登入使用者）。
   * @default false
   */
  clearOnError?: boolean
}

/**
 * 安全讀取並反序列化 localStorage 的值。
 *
 * @param key       localStorage key
 * @param fallback  解析失敗或 key 不存在時的預設值
 * @param options   選項（clearOnError）
 * @returns 解析後的值，或 fallback
 */
export function safeGet<T>(
  key: string,
  fallback: T,
  options: SafeGetOptions = {}
): T {
  const { clearOnError = false } = options
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch (err) {
    console.warn(
      `[safeStorage] Failed to parse localStorage["${key}"]. ` +
        `Returning fallback.${clearOnError ? ' Key will be cleared.' : ''}`,
      err
    )
    if (clearOnError) {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    }
    return fallback
  }
}

/**
 * 安全序列化並寫入 localStorage 的值。
 *
 * @param key   localStorage key
 * @param value 任意可被 JSON.stringify 序列化的值
 * @returns 是否成功寫入（儲存空間不足等情況會回傳 false）
 */
export function safeSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.warn(`[safeStorage] Failed to write localStorage["${key}"].`, err)
    return false
  }
}

/**
 * 安全移除 localStorage 的 key，不 throw。
 *
 * @param key localStorage key
 */
export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (err) {
    console.warn(`[safeStorage] Failed to remove localStorage["${key}"].`, err)
  }
}

/**
 * 批次安全讀取多個 key。
 *
 * @param specs 每個 key 的設定（key、fallback、options）
 * @returns 以 key 為索引的結果物件
 *
 * @example
 *   const { sessionsDb, attendeesDb } = safeGetAll({
 *     sessionsDb:  { key: 'superstart_sessions_db',  fallback: {} },
 *     attendeesDb: { key: 'superstart_attendees_db', fallback: {} },
 *   })
 */
export function safeGetAll<T extends Record<string, unknown>>(
  specs: {
    [K in keyof T]: { key: string; fallback: T[K]; options?: SafeGetOptions }
  }
): T {
  const result = {} as T
  for (const name in specs) {
    const { key, fallback, options } = specs[name]
    result[name] = safeGet(key, fallback, options) as T[typeof name]
  }
  return result
}
