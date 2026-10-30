<template>
  <section class="lecture-schedule glass-panel">
    <h2 class="section-title">🎤 {{ $t('teacher.lecture.title') }}</h2>
    <p class="text-muted text-sm mt-1">{{ $t('teacher.lecture.intro') }}</p>

    <p v-if="lectures.length === 0" class="empty-note mt-4">{{ $t('teacher.lecture.empty') }}</p>

    <template v-for="part in parts" :key="part.key">
      <h3 v-if="part.lectures.length" class="part-title mt-4">{{ part.title }}</h3>
      <article
        v-for="lecture in part.lectures"
        :key="lecture.key"
        class="lecture-card mt-2"
        :data-lecture="lecture.key"
      >
        <header class="lecture-header">
          <strong class="lecture-course">{{ lecture.courseTitle }}</strong>
          <span class="lecture-time">{{ formatTime(lecture.time) }}</span>
          <span v-if="!lecture.timeConfirmed" class="lecture-pending">
            {{ $t('teacher.lecture.timePending') }}
          </span>
        </header>
        <p class="text-muted text-xs mt-1">
          {{ $t('teacher.lecture.bookedBy', { names: lecture.teacherNames.join('、') }) }}
        </p>

        <ul class="lecture-attendees mt-2">
          <li v-for="row in lecture.attendees" :key="row.id" class="lecture-attendee">
            <span class="attendee-name">
              {{ displayName(row.studentUsername) }}
              <span class="text-muted text-xs">@{{ row.studentUsername }}</span>
            </span>
            <span
              v-if="!row.canRecord"
              class="attendee-status"
              :title="$t('teacher.lecture.recordLater')"
            >
              {{ attendanceLabel(row.attendanceStatus) }}
            </span>
            <span
              v-else
              class="att-status-toggle"
              role="group"
              :aria-label="
                $t('teacher.lecture.attendanceFor', { name: displayName(row.studentUsername) })
              "
            >
              <button
                type="button"
                :class="['att-toggle-btn', { active: row.attendanceStatus === 'attended' }]"
                :aria-pressed="row.attendanceStatus === 'attended'"
                @click="record(row, 'attended')"
              >
                {{ $t('teacher.booking.attended') }}
              </button>
              <button
                type="button"
                :class="['att-toggle-btn danger', { active: row.attendanceStatus === 'absent' }]"
                :aria-pressed="row.attendanceStatus === 'absent'"
                @click="record(row, 'absent')"
              >
                {{ $t('teacher.booking.absent') }}
              </button>
            </span>
          </li>
        </ul>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * 我的授課：連結到講師資料的教師帳號，在這裡看到自己擔任講師的所有預約。
 * 不同教師（例如男、女教師各自為學員安排）在同一時段預約同一課程時，合併成一堂課顯示；
 * 講師看得到全部學員（不分男女），並可記錄出席。預約本身仍由安排的教師管理。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import type { AttendanceStatus, BookingAttendee, BookingSession } from '@/stores/bookings'
import { useToast } from '@/composables/useToast'
import { lecturerIdsOf } from '@/utils/scope'
import { toLocalDateTimeInput } from '@/utils/datetime'

interface AttendeeRow extends BookingAttendee {
  /** Attendance can be recorded once the time is confirmed */
  canRecord: boolean
}

interface Lecture {
  key: string
  courseTitle: string
  time: string
  timeConfirmed: boolean
  teacherNames: string[]
  attendees: AttendeeRow[]
}

const { t } = useI18n()
const { toast } = useToast()
const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const bookingsStore = useBookingsStore()

const sessionTime = (s: BookingSession) => s.confirmedAt || s.proposedAt

/** Non-cancelled bookings where I am the lecturer, merged per course and time */
const lectures = computed<Lecture[]>(() => {
  const me = authStore.currentUser
  if (!me) return []
  const ids = lecturerIdsOf(me.username, coursesStore.lecturers)
  const byKey = new Map<string, { sessions: BookingSession[] }>()
  for (const s of bookingsStore.getSessionsByLecturers(ids)) {
    if (s.status === 'cancelled') continue
    const key = `${s.courseId}@${sessionTime(s)}`
    const group = byKey.get(key) ?? { sessions: [] }
    group.sessions.push(s)
    byKey.set(key, group)
  }
  return [...byKey.entries()].map(([key, { sessions }]) => ({
    key,
    courseTitle: sessions[0].courseTitle,
    time: sessionTime(sessions[0]),
    timeConfirmed: sessions.every((s) => s.status !== 'pending'),
    teacherNames: [...new Set(sessions.map((s) => displayName(s.teacherUsername)))],
    attendees: sessions.flatMap((s) =>
      bookingsStore
        .getAttendeesForSession(s.id)
        .map((a) => ({ ...a, canRecord: s.status !== 'pending' }))
    )
  }))
})

const parts = computed(() => {
  const now = toLocalDateTimeInput()
  const upcoming = lectures.value
    .filter((l) => l.time >= now)
    .sort((a, b) => a.time.localeCompare(b.time))
  const past = lectures.value
    .filter((l) => l.time < now)
    .sort((a, b) => b.time.localeCompare(a.time))
  return [
    { key: 'upcoming', title: t('teacher.lecture.upcoming'), lectures: upcoming },
    { key: 'past', title: t('teacher.lecture.past'), lectures: past }
  ]
})

function record(row: AttendeeRow, status: AttendanceStatus) {
  bookingsStore.updateAttendee(row.sessionId, row.studentUsername, { attendanceStatus: status })
  toast(t('teacher.lecture.recorded', { name: displayName(row.studentUsername) }), 'success')
}

function displayName(username: string): string {
  const u = authStore.usersDb[username]
  return u?.realName || u?.displayName || username
}

function attendanceLabel(status: AttendanceStatus): string {
  return t(`student.attendance.${status}`)
}

function formatTime(dt: string): string {
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.lecture-schedule {
  padding: 1.5rem;
}

.section-title {
  font-size: 1.2rem;
  color: var(--text-primary);
}

.part-title {
  font-size: 1rem;
  color: var(--text-primary);
}

.empty-note {
  color: var(--text-muted);
}

.lecture-card {
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: 1rem;
  background: var(--card-bg);
}

.lecture-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
}

.lecture-pending {
  font-size: 0.75rem;
  color: #92400e;
}

.lecture-attendees {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lecture-attendee {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-top: 1px dashed var(--card-border);
}

.attendee-status {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.att-status-toggle {
  display: flex;
  gap: 0.4rem;
}

.att-toggle-btn {
  padding: 0.3rem 0.7rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--card-border);
  background: transparent;
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
}

.att-toggle-btn.active {
  background: rgba(16, 185, 129, 0.15);
  color: #047857;
  border-color: rgba(16, 185, 129, 0.4);
}

.att-toggle-btn.danger.active {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.35);
}
</style>
