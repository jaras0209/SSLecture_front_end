/**
 * @file account.ts
 * @description 帳號名稱與信箱的規則。
 *
 * - 帳號（username）是系統內部永遠不變的識別碼：聽課紀錄、預約、關懷指派、家長綁定都靠它對應。
 *   一律小寫、去掉前後空白；只允許英數字與 . _ -，長度 3–30。比對不分大小寫。
 * - 信箱選填（孩子常沒有自己的信箱），可用來登入；有填就不能和別人重複，比對不分大小寫。
 *
 * 規則改這一處即一致套用（註冊、管理員建立帳號、社群登入補資料、個人資料、登入）。
 */

export const USERNAME_MIN = 3
export const USERNAME_MAX = 30
const USERNAME_PATTERN = /^[a-z0-9._-]+$/
// Deliberately loose: one @, something before it, a dot in the domain, no spaces
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The form a username is stored in: trimmed and lower-case */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

/** The form an email is stored in: trimmed and lower-case */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/** Why a (normalized) username can't be used, as an i18n key; undefined if it can */
export function usernameProblem(username: string): string | undefined {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return 'account.usernameLength'
  }
  if (!USERNAME_PATTERN.test(username)) return 'account.usernameChars'
  return undefined
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email)
}
