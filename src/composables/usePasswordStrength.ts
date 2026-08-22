/**
 * usePasswordStrength.ts
 * 密碼強度計算 composable
 *
 * 評分規則（0-3）：
 *   0 = 弱密碼（< 6 字元）
 *   1 = 普通（>= 6 字元）
 *   2 = 中等（>= 8 字元 + 大小寫混合或含數字）
 *   3 = 強密碼（長且含特殊符號）
 *
 * 使用方式：
 *   const { strength, label, textClass, barClass } = usePasswordStrength(passwordRef)
 */

import { computed } from 'vue'
import type { Ref } from 'vue'

/** 計算密碼分數（純函式，可獨立測試） */
export function calcPasswordStrength(p: string): number {
  if (p.length < 6) return 0
  let score = 1
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return Math.min(score - 1, 3)
}

const LABELS = ['弱密碼', '普通', '中等強度', '強密碼'] as const
const TEXT_CLASSES = ['text-weak', 'text-fair', 'text-medium', 'text-strong'] as const
const BAR_CLASSES = ['bar-weak', 'bar-fair', 'bar-medium', 'bar-strong'] as const

/**
 * 密碼強度 composable
 * @param password - 密碼的 ref 或 computed（響應式字串）
 */
export function usePasswordStrength(password: Ref<string>) {
  const strength = computed(() => calcPasswordStrength(password.value))
  const label     = computed(() => LABELS[strength.value]       ?? LABELS[0])
  const textClass = computed(() => TEXT_CLASSES[strength.value] ?? TEXT_CLASSES[0])

  /** 回傳第 idx 格強度 bar 的 CSS class（共 3 格，idx = 0/1/2） */
  function barClass(idx: number): string {
    const s = strength.value
    if (idx > s - 1) return 'bar-empty'
    return BAR_CLASSES[s]
  }

  return { strength, label, textClass, barClass }
}
