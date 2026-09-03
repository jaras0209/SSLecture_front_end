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
                <span v-if="item.session.isGroupSession" class="booking-group-badge">{{ $t('student.course.groupSession') }}</span>
              </div>
            </div>

            <div class="sbc-info mt-2">
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.course') }}</span>
                <span class="sbc-value">{{ item.session.courseTitle }}</span>
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.lecturer') }}</span>
                <span class="sbc-value">{{ item.session.lecturerTitle }} {{ item.session.lecturerName }}</span>
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.time') }}</span>
                <span class="sbc-value">{{ formatBookingTime(item.session) }}</span>
              </div>
              <div class="sbc-info-item" v-if="item.session.durationMinutes">
                <span class="sbc-label">{{ $t('student.course.duration') }}</span>
                <span class="sbc-value">{{ $t('student.course.minutes', { n: item.session.durationMinutes }) }}</span>
              </div>
            </div>

            <!-- Prep content (if any) -->
            <div
              v-if="item.session.prep.scriptures.length || item.session.prep.readingNotes || item.session.prep.materials"
              class="sbc-prep mt-3"
            >
              <div class="sbc-prep-title">{{ $t('student.course.prepTitle') }}</div>
              <div v-if="item.session.prep.scriptures.length" class="sbc-prep-row">
                <strong>📜 {{ $t('student.course.scriptures') }}：</strong>
                <span v-for="(s, i) in item.session.prep.scriptures" :key="i" class="scripture-chip">{{ s }}</span>
              </div>
              <div v-if="item.session.prep.readingNotes" class="sbc-prep-row">
                <strong>📝 {{ $t('student.course.readingNotes') }}：</strong>{{ item.session.prep.readingNotes }}
              </div>
              <div v-if="item.session.prep.materials" class="sbc-prep-row">
                <strong>📎 {{ $t('student.course.materials') }}：</strong>{{ item.session.prep.materials }}
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
                  {{ item.attendee.attendanceStatus === 'attended' ? $t('student.attendance.attended')
                    : item.attendee.attendanceStatus === 'absent' ? $t('student.attendance.absent')
                    : $t('student.attendance.invited') }}
                </span>
              </div>
              <button
                v-if="item.session.status === 'completed' && !item.attendee.studentFeedback"
                class="btn btn-sm btn-outline"
                @click="emit('open-feedback', item)"
                :id="`btn-feedback-${item.session.id}`"
              >✍️ {{ $t('student.attendance.writeFeedback') }}</button>
              <button
                v-else-if="item.session.status === 'completed' && item.attendee.studentFeedback"
                class="btn btn-sm btn-ghost"
                @click="emit('open-feedback', item)"
              >📝 {{ $t('student.attendance.viewFeedback') }}</button>
            </div>

            <div class="sbc-info mt-2">
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.course') }}</span>
                <span class="sbc-value">{{ item.session.courseTitle }}</span>
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.lecturer') }}</span>
                <span class="sbc-value">{{ item.session.lecturerTitle }} {{ item.session.lecturerName }}</span>
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">{{ $t('student.course.time') }}</span>
                <span class="sbc-value">{{ formatBookingTime(item.session) }}</span>
              </div>
            </div>

            <!-- Teacher feedback (if any) -->
            <div v-if="item.attendee.teacherFeedback" class="sbc-teacher-feedback mt-2">
              <strong>💬 {{ $t('student.attendance.teacherFeedback') }}：</strong>{{ item.attendee.teacherFeedback }}
            </div>

            <!-- My reflection -->
            <div v-if="item.attendee.studentFeedback" class="sbc-my-feedback mt-2">
              <strong>✍️ {{ $t('student.attendance.myFeedback') }}：</strong>{{ item.attendee.studentFeedback }}
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

function formatBookingTime(session: { proposedAt: string; confirmedAt?: string; status: string }): string {
  const dt = session.confirmedAt || session.proposedAt
  if (!dt) return '—'
  const d = new Date(dt)
  const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
  const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  const isPending = !session.confirmedAt && session.status === 'pending'
  return `${dateStr} ${timeStr}${isPending ? t('student.attendance.proposed') : ''}`
}
</script>
