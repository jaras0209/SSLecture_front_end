/**
 * @file useMyLectures.ts
 * @description 我的授課：連結到講師資料的帳號（教師或牧者）擔任講師的預約。
 *
 * 不同教師（例如男、女教師各自為學員安排）在同一時段預約同一課程時，合併成一堂課；
 * 講師看得到全部學員（不分男女）。時間確認後可記錄出席，時間已過、仍有學員停在「已邀請」
 * 的課算作「待記錄」，用於分頁上的提醒數字。
 */
import { computed, onScopeDispose, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import type { BookingAttendee, BookingSession } from '@/stores/bookings'
import { lecturerIdsOf } from '@/utils/scope'
import { toLocalDateTimeInput } from '@/utils/datetime'

export interface LectureAttendee extends BookingAttendee {
  /** Attendance can be recorded once the time is confirmed */
  canRecord: boolean
}

export interface Lecture {
  key: string
  courseTitle: string
  /** Local date-time (YYYY-MM-DDTHH:mm), as bookings store it */
  time: string
  timeConfirmed: boolean
  teacherUsernames: string[]
  attendees: LectureAttendee[]
  /** Attendees whose attendance can be recorded but hasn't been */
  unrecorded: number
}

const sessionTime = (s: BookingSession) => s.confirmedAt || s.proposedAt

export function useMyLectures() {
  const authStore = useAuthStore()
  const coursesStore = useCoursesStore()
  const bookingsStore = useBookingsStore()

  // "Now" moves on by itself, so a lecture becomes due without anything else changing
  const now = ref(toLocalDateTimeInput())
  const timer = setInterval(() => (now.value = toLocalDateTimeInput()), 60_000)
  onScopeDispose(() => clearInterval(timer))

  /** Non-cancelled bookings where I am the lecturer, merged per course and time */
  const lectures = computed<Lecture[]>(() => {
    const me = authStore.currentUser
    if (!me) return []
    const ids = lecturerIdsOf(me.username, coursesStore.lecturers)
    const byKey = new Map<string, BookingSession[]>()
    for (const s of bookingsStore.getSessionsByLecturers(ids)) {
      if (s.status === 'cancelled') continue
      const key = `${s.courseId}@${sessionTime(s)}`
      byKey.set(key, [...(byKey.get(key) ?? []), s])
    }
    return [...byKey.entries()].map(([key, sessions]) => {
      const attendees = sessions.flatMap((s) =>
        bookingsStore
          .getAttendeesForSession(s.id)
          .map((a) => ({ ...a, canRecord: s.status !== 'pending' }))
      )
      return {
        key,
        courseTitle: sessions[0].courseTitle,
        time: sessionTime(sessions[0]),
        timeConfirmed: sessions.every((s) => s.status !== 'pending'),
        teacherUsernames: [...new Set(sessions.map((s) => s.teacherUsername))],
        attendees,
        unrecorded: attendees.filter((a) => a.canRecord && a.attendanceStatus === 'invited').length
      }
    })
  })

  const upcoming = computed(() =>
    lectures.value.filter((l) => l.time >= now.value).sort((a, b) => a.time.localeCompare(b.time))
  )
  const past = computed(() =>
    lectures.value.filter((l) => l.time < now.value).sort((a, b) => b.time.localeCompare(a.time))
  )

  /** Past lectures with attendance still to record */
  const awaitingAttendance = computed(() => past.value.filter((l) => l.unrecorded > 0))

  return { lectures, upcoming, past, awaitingAttendance }
}
