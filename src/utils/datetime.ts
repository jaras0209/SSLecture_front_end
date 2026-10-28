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
