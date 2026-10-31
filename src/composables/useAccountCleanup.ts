/**
 * @file useAccountCleanup.ts
 * @description 帳號被刪除或換角色時，清掉指向它的資料，避免留下無效的指派或連結。
 *
 * 角色離開時：
 * - 學員：從所有家長帳號解除綁定，並移除其輔導教師／關懷牧者指派
 * - 輔導教師：移除擔任輔導教師的指派、取消尚未進行的預約（待確認／已確認）；
 *   已完成與已取消的預約保留為紀錄
 * - 分區牧者：移除擔任關懷牧者的指派
 * - 教師與牧者都可以連結講師資料：帳號刪除、或改成不能授課的角色時，解除講師與此帳號的
 *   連結（講師以姓名保留）；教師與牧者互換時保留連結
 * 教學統計、學習紀錄等歷史資料不動。
 */
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import type { UserRole } from '@/types/auth'
import { canLecture } from '@/utils/scope'

export interface ReleaseSummary {
  mentorAssignments: number
  lecturerLinks: number
  cancelledBookings: number
}

export function useAccountCleanup() {
  const authStore = useAuthStore()
  const coursesStore = useCoursesStore()
  const bookingsStore = useBookingsStore()
  const { t } = useI18n()

  /** Clean up what depends on `username` having `role`; `why` decides the bookings' cancel reason */
  function releaseRole(
    username: string,
    role: UserRole,
    why: 'deleted' | 'roleChanged',
    newRole?: UserRole
  ): ReleaseSummary {
    const summary: ReleaseSummary = { mentorAssignments: 0, lecturerLinks: 0, cancelledBookings: 0 }
    if (role === 'student') {
      authStore.unbindChildEverywhere(username)
      coursesStore.releaseStudent(username)
    } else if (role === 'teacher') {
      summary.mentorAssignments = coursesStore.releaseCaretaker(username, 'teacher')
      summary.cancelledBookings = bookingsStore.cancelOpenSessionsOf(
        username,
        why === 'deleted'
          ? t('admin.cleanup.cancelReasonDeleted')
          : t('admin.cleanup.cancelReasonRoleChanged')
      )
    } else if (role === 'pastor') {
      summary.mentorAssignments = coursesStore.releaseCaretaker(username, 'pastor')
    }
    if (canLecture(role) && !(why === 'roleChanged' && canLecture(newRole))) {
      summary.lecturerLinks = coursesStore.unlinkLecturerAccount(username)
    }
    return summary
  }

  return { releaseRole }
}
