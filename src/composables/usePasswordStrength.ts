/**
 * usePasswordStrength.ts
 * 密碼強度：規則只寫在這裡，提示文字、規則清單與送出前的檢查都由此而來。
 *
 * 規則：至少 6 個字元，並符合以下四項中的任兩項才算夠強（中等強度）：
 *   8 個字元以上、同時有大寫和小寫英文字母、包含數字、包含符號
 *
 * 強度 0-3：未滿 6 字元為 0；之後每符合一項加 1（最高 3）。
 *   0 = 弱、1 = 普通、2 = 中等（最低要求）、3 = 強
 *
 * 使用方式：
 *   const { strength, label, textClass, barClass, checks } = usePasswordStrength(passwordRef)
 */

import { computed } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'

/** Fewest characters a password may have */
export const PASSWORD_MIN_LENGTH = 6
/** Lowest strength a new password may have */
export const MIN_PASSWORD_STRENGTH = 2

/** The rule items shown under a password field; `required` must be met, the others count */
export type PasswordCheck = {
  key: 'minLength' | 'length8' | 'mixedCase' | 'number' | 'special'
  ok: boolean
  required?: boolean
}

/** Which rule items a password meets (pure; the order is the order shown) */
export function passwordChecks(p: string): PasswordCheck[] {
  return [
    { key: 'minLength', ok: p.length >= PASSWORD_MIN_LENGTH, required: true },
    { key: 'length8', ok: p.length >= 8 },
    { key: 'mixedCase', ok: /[A-Z]/.test(p) && /[a-z]/.test(p) },
    { key: 'number', ok: /[0-9]/.test(p) },
    { key: 'special', ok: /[^A-Za-z0-9]/.test(p) }
  ]
}

/** 計算密碼分數 0-3（純函式，可獨立測試） */
export function calcPasswordStrength(p: string): number {
  const checks = passwordChecks(p)
  if (checks.some((c) => c.required && !c.ok)) return 0
  return Math.min(checks.filter((c) => !c.required && c.ok).length, 3)
}

/** Whether a password is strong enough to be set */
export function isStrongEnough(p: string): boolean {
  return calcPasswordStrength(p) >= MIN_PASSWORD_STRENGTH
}

// i18n keys 對應強度等級 0-3
const LABEL_KEYS = [
  'passwordStrength.weak',
  'passwordStrength.fair',
  'passwordStrength.medium',
  'passwordStrength.strong'
] as const

const TEXT_CLASSES = ['text-weak', 'text-fair', 'text-medium', 'text-strong'] as const
const BAR_CLASSES = ['bar-weak', 'bar-fair', 'bar-medium', 'bar-strong'] as const

/**
 * 密碼強度 composable
 * @param password - 密碼的 ref 或 computed（響應式字串）
 */
export function usePasswordStrength(password: Ref<string>) {
  const { t } = useI18n()
  const strength = computed(() => calcPasswordStrength(password.value))
  const label = computed(() => {
    const key = LABEL_KEYS[strength.value] ?? LABEL_KEYS[0]
    // Use the same explicit cast pattern as useI18nHelper to handle dynamic keys
    return (t as (k: string) => string)(key)
  })
  const textClass = computed(() => TEXT_CLASSES[strength.value] ?? TEXT_CLASSES[0])
  const checks = computed(() => passwordChecks(password.value))

  /** 回傳第 idx 格強度 bar 的 CSS class（共 3 格，idx = 0/1/2） */
  function barClass(idx: number): string {
    const s = strength.value
    if (s === 0) return idx === 0 ? 'bar-weak' : 'bar-empty'
    if (idx > s - 1) return 'bar-empty'
    return BAR_CLASSES[s] ?? 'bar-empty'
  }

  return { strength, label, textClass, barClass, checks }
}
