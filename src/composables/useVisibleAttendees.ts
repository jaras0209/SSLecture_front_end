/**
 * 一場預約中，目前登入的教師看得到哪些學員（依性別與照顧關係，見 utils/scope），
 * 以及有幾位被隱藏。預約列表與「完成並填寫回饋」對話框共用。
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore, type BookingAttendee } from '@/stores/bookings'
import { canViewAttendee, viewerOf } from '@/utils/scope'

export function useVisibleAttendees() {
  const authStore = useAuthStore()
  const coursesStore = useCoursesStore()
  const bookingsStore = useBookingsStore()

  /** The signed-in teacher, read from the account so their gender is current */
  const viewer = computed(() => {
    const me = authStore.currentUser
    return me ? (viewerOf(me.username, authStore.usersDb) ?? me) : null
  })

  /** A session's attendees split into those this teacher may see and how many are hidden */
  function attendeesOf(sessionId: string): { shown: BookingAttendee[]; hidden: number } {
    const all = bookingsStore.getAttendeesForSession(sessionId)
    const session = bookingsStore.sessionsDb[sessionId]
    const v = viewer.value
    const shown =
      v && session
        ? all.filter((a) =>
            canViewAttendee(
              v,
              session,
              a.studentUsername,
              authStore.usersDb,
              coursesStore.lecturers
            )
          )
        : []
    return { shown, hidden: all.length - shown.length }
  }

  return { viewer, attendeesOf }
}
