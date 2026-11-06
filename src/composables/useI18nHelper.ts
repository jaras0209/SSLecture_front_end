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
import { lecturerTitleCode } from '@/utils/lecturerTitle'

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

  /**
   * A lecturer's title in the current language. Titles are stored as codes (`pastor`);
   * older Chinese ones are understood too, and anything else is shown as written.
   * @example tLecturerTitle('pastor') → 'Pastor' (en) / '牧師' (zh-TW)
   */
  function tLecturerTitle(value: string | undefined): string {
    if (!value) return ''
    const code = lecturerTitleCode(value)
    return code ? tDynamic(`teacher.lecturer.titleOptions.${code}`) : value
  }

  /**
   * The lecturer of a listen session, stored as text: "name title" (e.g. 張牧師 牧師).
   * A known title at the end is shown in the current language; the rest as written.
   * @example tLecturerLabel('張牧師 牧師') → '張牧師 Pastor' (en)
   */
  function tLecturerLabel(text: string | undefined): string {
    if (!text) return ''
    const m = /^(.*\S)\s+(\S+)$/.exec(text.trim())
    if (!m || !lecturerTitleCode(m[2])) return text
    return `${m[1]} ${tLecturerTitle(m[2])}`
  }

  /**
   * Names joined as the current language lists them.
   * @example tList(['媽媽', '爸爸']) → '媽媽、爸爸' (zh-TW) / 'Mom and Dad' (en)
   */
  function tList(items: string[]): string {
    if (locale.value.startsWith('zh')) return items.join('、')
    return new Intl.ListFormat(locale.value, { type: 'conjunction' }).format(items)
  }

  return {
    tList,
    tDynamic,
    tRole,
    tStatus,
    tDateTime,
    tDate,
    tBookingTime,
    tLecturerTitle,
    tLecturerLabel
  }
}
