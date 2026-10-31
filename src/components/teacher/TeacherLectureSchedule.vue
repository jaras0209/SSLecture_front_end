<template>
  <section class="lecture-schedule glass-panel">
    <h2 class="section-title">🎤 {{ $t('teacher.lecture.title') }}</h2>
    <p class="text-muted text-sm mt-1">{{ $t('teacher.lecture.intro') }}</p>

    <p v-if="lectures.length === 0" class="empty-note mt-4">{{ $t('teacher.lecture.empty') }}</p>
    <p v-if="awaitingAttendance.length" class="due-banner mt-4" role="status">
      📝 {{ $t('teacher.lecture.dueBanner', { n: awaitingAttendance.length }) }}
    </p>

    <template v-for="part in parts" :key="part.key">
      <h3 v-if="part.lectures.length" class="part-title mt-4">{{ part.title }}</h3>
      <article
        v-for="lecture in part.lectures"
        :key="lecture.key"
        :class="['lecture-card mt-2', { 'lecture-due': dueKeys.has(lecture.key) }]"
        :data-lecture="lecture.key"
      >
        <header class="lecture-header">
          <strong class="lecture-course">{{ lecture.courseTitle }}</strong>
          <span class="lecture-time">{{ tDateTime(lecture.time) }}</span>
          <span v-if="!lecture.timeConfirmed" class="lecture-pending">
            {{ $t('teacher.lecture.timePending') }}
          </span>
          <span v-if="dueKeys.has(lecture.key)" class="lecture-due-tag">
            {{ $t('teacher.lecture.dueTag', { n: lecture.unrecorded }) }}
          </span>
        </header>
        <p class="text-muted text-xs mt-1">
          {{
            $t('teacher.lecture.bookedBy', {
              names: lecture.teacherUsernames.map(authStore.displayNameOf).join('、')
            })
          }}
        </p>

        <ul class="lecture-attendees mt-2">
          <li v-for="row in lecture.attendees" :key="row.id" class="lecture-attendee">
            <span class="attendee-name">
              {{ authStore.displayNameOf(row.studentUsername) }}
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
                $t('teacher.lecture.attendanceFor', {
                  name: authStore.displayNameOf(row.studentUsername)
                })
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
 * 我的授課：連結到講師資料的教師或牧者帳號，在這裡看到自己擔任講師的所有預約
 * （合併規則見 useMyLectures）。講師看得到全部學員（不分男女），並可記錄出席；
 * 預約本身仍由安排的教師管理。時間已過、尚未記錄出席的課會標示出來。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useAuthStore } from '@/stores/auth'
import { useBookingsStore } from '@/stores/bookings'
import type { AttendanceStatus } from '@/stores/bookings'
import { useToast } from '@/composables/useToast'
import { useMyLectures, type LectureAttendee } from '@/composables/useMyLectures'

const { t } = useI18n()
const { tDateTime } = useI18nHelper()
const { toast } = useToast()
const authStore = useAuthStore()
const bookingsStore = useBookingsStore()
const { lectures, upcoming, past, awaitingAttendance } = useMyLectures()

const parts = computed(() => [
  { key: 'upcoming', title: t('teacher.lecture.upcoming'), lectures: upcoming.value },
  { key: 'past', title: t('teacher.lecture.past'), lectures: past.value }
])

/** Lectures that are over with attendance left to record */
const dueKeys = computed(() => new Set(awaitingAttendance.value.map((l) => l.key)))

function record(row: LectureAttendee, status: AttendanceStatus) {
  bookingsStore.updateAttendee(row.sessionId, row.studentUsername, { attendanceStatus: status })
  toast(
    t('teacher.lecture.recorded', { name: authStore.displayNameOf(row.studentUsername) }),
    'success'
  )
}

function attendanceLabel(status: AttendanceStatus): string {
  return t(`student.attendance.${status}`)
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

.due-banner {
  padding: 0.6rem 0.9rem;
  border-radius: var(--radius-md);
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  font-size: 0.9rem;
  font-weight: 600;
}

.lecture-card.lecture-due {
  border-color: rgba(245, 158, 11, 0.55);
}

.lecture-due-tag {
  font-size: 0.75rem;
  font-weight: 600;
  color: #92400e;
  background: rgba(245, 158, 11, 0.15);
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
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
