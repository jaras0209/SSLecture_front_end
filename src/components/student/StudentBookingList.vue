<template>
  <div class="dashboard-body no-print">
    <section class="glass-panel student-bookings-panel">
      <div class="panel-header-row">
        <h3 class="section-title">{{ $t('student.course.bookingsTitle') }}</h3>
      </div>

      <!-- Upcoming -->
      <div class="booking-section mt-4">
        <h4 class="booking-section-title">{{ $t('student.course.upcomingTitle') }}</h4>
        <div class="booking-list">
          <div
            v-for="item in studentUpcomingSessions"
            :key="item.session.id"
            class="student-booking-card glass-card"
          >
            <div class="sbc-header">
              <div class="sbc-status-row">
                <span :class="['booking-status-badge', `status-${item.session.status}`]">
                  {{ bookingStatusLabel(item.session.status) }}
                </span>
                <span v-if="item.session.isGroupSession" class="booking-group-badge">{{
                  $t('student.course.groupSession')
                }}</span>
              </div>
            </div>

            <div class="sbc-info mt-2">
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.course') }}</span>
                <span class="sbc-value">{{ item.session.courseTitle }}</span>
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.lecturer') }}</span>
                <span class="sbc-value"
                  >{{ item.session.lecturerTitle }} {{ item.session.lecturerName }}</span
                >
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.time') }}</span>
                <span class="sbc-value">{{ formatBookingTime(item.session) }}</span>
              </div>
              <div v-if="item.session.durationMinutes" class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.duration') }}</span>
                <span class="sbc-value">{{
                  $t('student.course.minutes', { n: item.session.durationMinutes })
                }}</span>
              </div>
            </div>

            <!-- Prep content (if any) -->
            <div
              v-if="
                item.session.prep.scriptures.length ||
                item.session.prep.readingNotes ||
                item.session.prep.materials
              "
              class="sbc-prep mt-3"
            >
              <div class="sbc-prep-title">{{ $t('student.course.prepTitle') }}</div>
              <div v-if="item.session.prep.scriptures.length" class="sbc-prep-row">
                <strong>📜 {{ $t('student.course.scriptures') }}：</strong>
                <span
                  v-for="(s, i) in item.session.prep.scriptures"
                  :key="i"
                  class="scripture-chip"
                  >{{ s }}</span
                >
              </div>
              <div v-if="item.session.prep.readingNotes" class="sbc-prep-row">
                <strong>📝 {{ $t('student.course.readingNotes') }}：</strong
                >{{ item.session.prep.readingNotes }}
              </div>
              <div v-if="item.session.prep.materials" class="sbc-prep-row">
                <strong>📎 {{ $t('student.course.materials') }}：</strong
                >{{ item.session.prep.materials }}
              </div>
            </div>
          </div>

          <div v-if="studentUpcomingSessions.length === 0" class="empty-booking-hint">
            {{ $t('student.course.noUpcoming') }} 🎉
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="booking-section mt-5">
        <h4 class="booking-section-title">📁 {{ $t('student.course.noPast') }}</h4>
        <div class="booking-list">
          <div
            v-for="item in studentPastSessions"
            :key="item.session.id"
            class="student-booking-card glass-card"
            :class="{ 'card-completed': item.session.status === 'completed' }"
          >
            <div class="sbc-header">
              <div class="sbc-status-row">
                <span :class="['booking-status-badge', `status-${item.session.status}`]">
                  {{ bookingStatusLabel(item.session.status) }}
                </span>
                <span :class="['att-chip', `att-${item.attendee.attendanceStatus}`]">
                  {{
                    item.attendee.attendanceStatus === 'attended'
                      ? $t('student.attendance.attended')
                      : item.attendee.attendanceStatus === 'absent'
                        ? $t('student.attendance.absent')
                        : $t('student.attendance.invited')
                  }}
                </span>
              </div>
              <button
                v-if="item.session.status === 'completed' && !item.attendee.studentFeedback"
                :id="`btn-feedback-${item.session.id}`"
                class="btn btn-sm btn-outline"
                @click="emit('open-feedback', item)"
              >
                ✍️ {{ $t('student.attendance.writeFeedback') }}
              </button>
              <button
                v-else-if="item.session.status === 'completed' && item.attendee.studentFeedback"
                class="btn btn-sm btn-ghost"
                @click="emit('open-feedback', item)"
              >
                📝 {{ $t('student.attendance.viewFeedback') }}
              </button>
            </div>

            <div class="sbc-info mt-2">
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.course') }}</span>
                <span class="sbc-value">{{ item.session.courseTitle }}</span>
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.lecturer') }}</span>
                <span class="sbc-value"
                  >{{ item.session.lecturerTitle }} {{ item.session.lecturerName }}</span
                >
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.time') }}</span>
                <span class="sbc-value">{{ formatBookingTime(item.session) }}</span>
              </div>
            </div>

            <!-- Teacher feedback (if any) -->
            <div v-if="item.attendee.teacherFeedback" class="sbc-teacher-feedback mt-2">
              <strong>💬 {{ $t('student.attendance.teacherFeedback') }}：</strong
              >{{ item.attendee.teacherFeedback }}
            </div>

            <!-- My reflection -->
            <div v-if="item.attendee.studentFeedback" class="sbc-my-feedback mt-2">
              <strong>✍️ {{ $t('student.attendance.myFeedback') }}：</strong
              >{{ item.attendee.studentFeedback }}
            </div>
          </div>

          <div v-if="studentPastSessions.length === 0" class="empty-booking-hint">
            {{ $t('student.course.noPast') }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useBookingsStore } from '@/stores/bookings'
import type { BookingSession, BookingAttendee } from '@/stores/bookings'

export interface FeedbackItem {
  session: BookingSession
  attendee: BookingAttendee
}

const emit = defineEmits<{
  'open-feedback': [item: FeedbackItem]
}>()

const authStore = useAuthStore()
const bookingsStore = useBookingsStore()
const { t } = useI18n()

// ── Session Lists ─────────────────────────────────────────────────────────────

const studentUpcomingSessions = computed(() => {
  const me = authStore.currentUser
  if (!me) return []
  return bookingsStore.getUpcomingSessions(me.username)
})

const studentPastSessions = computed(() => {
  const me = authStore.currentUser
  if (!me) return []
  return bookingsStore.getPastSessions(me.username)
})

// ── Display Helpers ───────────────────────────────────────────────────────────

function bookingStatusLabel(status: string): string {
  return t(`booking.status.${status}`) || status
}

function formatBookingTime(session: {
  proposedAt: string
  confirmedAt?: string
  status: string
}): string {
  const dt = session.confirmedAt || session.proposedAt
  if (!dt) return '—'
  const d = new Date(dt)
  const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const isPending = !session.confirmedAt && session.status === 'pending'
  return `${dateStr} ${timeStr}${isPending ? t('student.attendance.proposed') : ''}`
}
</script>

<style scoped>
/* [css-migration] moved from StudentDashboard.vue */
@media (max-width: 480px) {
  .sbc-prep-row {
    font-size: 0.8rem;
  }
}

.booking-section {
  margin-bottom: 1rem;
}

.booking-section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);
}

.student-booking-card.card-completed {
  border-color: rgba(16, 185, 129, 0.2);
}

.sbc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sbc-status-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.sbc-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 1.4rem;
}

.sbc-info-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
}

.sbc-label {
  color: var(--text-secondary);
  font-size: 0.76rem;
}

.sbc-value {
  font-weight: 600;
  color: var(--text-primary);
}

/* Prep box */
.sbc-prep {
  background: rgba(99, 102, 241, 0.04);
  border: 1px dashed rgba(99, 102, 241, 0.18);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
}

.sbc-prep-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.4rem;
}

.sbc-prep-row {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.2rem;
}

/* Feedback boxes */
.sbc-teacher-feedback {
  font-size: 0.8rem;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.05);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  border-left: 3px solid rgba(37, 99, 235, 0.3);
}

.sbc-my-feedback {
  font-size: 0.8rem;
  color: #059669;
  background: rgba(16, 185, 129, 0.05);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  border-left: 3px solid rgba(16, 185, 129, 0.3);
}

.empty-booking-hint {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  padding: 2rem 0;
  font-style: italic;
}
</style>

<style>
/*
 * Intentionally global: used by several components, element selectors / keyframes,
 * or rules whose look depends on cascade order against main.css and other global
 * styles (scoping would raise their specificity and change what wins).
 */
/* [css-migration] moved from StudentDashboard.vue */
@media (max-width: 480px) {
  /* Booking panel styles */
  .student-bookings-panel {
    padding: 0.75rem !important;
  }
}

.student-bookings-panel {
  padding: 1.5rem;
}

.student-booking-card {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: white;
  border: 1px solid rgba(99, 102, 241, 0.1);
  transition: box-shadow 0.2s;
}

.student-booking-card:hover {
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);
}
</style>
