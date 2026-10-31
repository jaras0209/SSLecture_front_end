/**
 * useI18nHelper — centralizes dynamic i18n key lookups.
 *
 * Problem: vue-i18n's `t()` cannot statically infer types for dynamic
 * keys (template literals, computed strings). Scattering `(t as any)(key)`
 * throughout components makes the codebase harder to search and maintain.
 *
 * Solution: route all dynamic-key translations through this composable so
 * there is a single, documented place where the type cast lives.
 *
 * Usage:
 *   const { tDynamic, tRole } = useI18nHelper()
 *   tDynamic(`booking.status.${status}`)   // any dynamic key
 *   tRole('teacher')                        // roleLabel.{role}
 */
import { useI18n } from 'vue-i18n'
import { formatDate, formatDateTime } from '@/utils/datetime'

export function useI18nHelper() {
  const { t, locale } = useI18n()

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

  /**
   * Format a stored ISO timestamp for display in the current locale.
   * @example tDateTime('2026-10-28T06:30:00.000Z') → '2026/10/28 14:30' (zh-TW, UTC+8)
   */
  function tDateTime(value: string | undefined): string {
    return formatDateTime(value, locale.value)
  }

  /** A date (no time) in the current locale, e.g. an invite code's expiry */
  function tDate(value: string | undefined): string {
    return formatDate(value, locale.value)
  }

  /**
   * A booking's time in the current language: the confirmed time, else the proposed one,
   * marked as proposed while the booking is still pending.
   */
  function tBookingTime(session: { proposedAt: string; confirmedAt?: string; status: string }) {
    const time = tDateTime(session.confirmedAt || session.proposedAt) || '—'
    const proposed = !session.confirmedAt && session.status === 'pending'
    return proposed ? time + t('student.attendance.proposed') : time
  }

  return { tDynamic, tRole, tStatus, tDateTime, tDate, tBookingTime }
}
