/**
 * useI18nHelper — centralizes dynamic i18n key lookups.
 *
 * Problem: vue-i18n v10's `t()` cannot statically infer types for dynamic
 * keys (template literals, computed strings). Scattering `(t as any)(key)`
 * throughout components makes the codebase harder to search and maintain.
 *
 * Solution: route all dynamic-key translations through this composable so
 * there is a single, documented place where the `as any` cast lives.
 *
 * Usage:
 *   const { tDynamic, tRole } = useI18nHelper()
 *   tDynamic(`booking.status.${status}`)   // any dynamic key
 *   tRole('teacher')                        // roleLabel.{role}
 */
import { useI18n } from 'vue-i18n'

export function useI18nHelper() {
  const { t } = useI18n()

  /**
   * Translate a fully-qualified dynamic key.
   * @example tDynamic(`booking.status.${status}`)
   */
  function tDynamic(key: string, values?: Record<string, unknown>): string {
    return (t as (k: string, v?: Record<string, unknown>) => string)(key, values)
  }

  /**
   * Translate a role label via `roleLabel.{role}`.
   * @example tRole('teacher') → 'Mentor Teacher' (en) / '輔導教師' (zh-TW)
   */
  function tRole(role: string): string {
    return tDynamic(`roleLabel.${role}`)
  }

  /**
   * Translate a booking status via `booking.status.{status}`.
   * @example tStatus('pending') → 'Pending' (en) / '待確認' (zh-TW)
   */
  function tStatus(status: string): string {
    return tDynamic(`booking.status.${status}`)
  }

  return { tDynamic, tRole, tStatus }
}
