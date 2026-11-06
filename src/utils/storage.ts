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
 *
 * 寫入失敗（儲存空間已滿、無痕模式、瀏覽器封鎖網站資料）時另外設定
 * storageWriteFailed，讓畫面告訴使用者資料沒有存到這台裝置上。
 */

import { ref } from 'vue'

/**
 * Set when the browser refused a write: until a backend exists, what was just changed is
 * lost on reload. App.vue shows a warning; dismissing it sets this back to false.
 */
export const storageWriteFailed = ref(false)

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
export function safeGet<T>(key: string, fallback: T, options: SafeGetOptions = {}): T {
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
    storageWriteFailed.value = true
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
 * 監聽「其他分頁」對 localStorage[key] 的變更（storage 事件只在別的分頁寫入時觸發）。
 * newValue 為原始字串；key 被移除或整個 localStorage 被清除時為 null。
 * 回傳取消監聽的函式。
 */
export function onStorageChange(
  key: string,
  callback: (newValue: string | null) => void
): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (event: StorageEvent) => {
    if (event.storageArea && event.storageArea !== localStorage) return
    // key === null means localStorage.clear() in another tab
    if (event.key === key || event.key === null) callback(event.newValue)
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
