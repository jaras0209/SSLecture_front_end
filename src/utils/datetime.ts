/**
 * @file datetime.ts
 * @description 本地時間格式化工具。
 *
 * `<input type="datetime-local">` 的值是「本地時間」且不含時區（例如 2026-10-28T14:30），
 * 不可與 `toISOString()`（UTC）直接比較或作為預設值，否則在 UTC+8 會差 8 小時。
 */

const pad = (n: number): string => String(n).padStart(2, '0')

/**
 * 將 Date 轉為 datetime-local 格式字串（YYYY-MM-DDTHH:mm，本地時間）。
 * 可直接與 datetime-local 輸入值做字串比較或作為其預設值。
 */
export function toLocalDateTimeInput(date: Date = new Date()): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** 目前時間的 ISO 8601 字串（UTC）。所有「儲存用」的時間戳記一律使用此格式。 */
export function nowIso(): string {
  return new Date().toISOString()
}

// 舊版以 toLocaleString('zh-TW', { hour12: false }) 儲存的格式，例如 "2026/10/28 14:30:00"
// （月、日不補零；部分瀏覽器午夜會輸出 "24:05:00"）
const LEGACY_ZH_TW_DATETIME = /^(\d{4})\/(\d{1,2})\/(\d{1,2})[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/

/**
 * 將舊版 zh-TW 本地時間字串轉為 ISO 8601（依瀏覽器本地時區解讀）。
 * 已是其他格式（ISO、空字串等）或無法辨識時原樣回傳，因此可重複呼叫。
 */
export function normalizeLegacyDateTime(value: string): string {
  const m = LEGACY_ZH_TW_DATETIME.exec(value.trim())
  if (!m) return value
  const [, y, mo, d, h, mi, s] = m
  const hour = Number(h) === 24 ? 0 : Number(h)
  const date = new Date(Number(y), Number(mo) - 1, Number(d), hour, Number(mi), Number(s ?? 0))
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

/**
 * 依語系顯示日期時間（年/月/日 時:分，24 小時制）。
 * 無法解析的值（例如尚未遷移的舊資料）原樣顯示。
 */
export function formatDateTime(value: string | undefined, locale: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(date)
}
