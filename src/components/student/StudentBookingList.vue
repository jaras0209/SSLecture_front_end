<template>
  <div class="dashboard-body no-print">
    <section class="glass-panel student-bookings-panel">
      <div class="panel-header-row">
        <h3 class="section-title">📅 我的聽課預約</h3>
      </div>

      <!-- 即將到來 -->
      <div class="booking-section mt-4">
        <h4 class="booking-section-title">⏰ 即將到來的預約</h4>
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
                <span v-if="item.session.isGroupSession" class="booking-group-badge">👥 團體課</span>
              </div>
            </div>

            <div class="sbc-info mt-2">
              <div class="sbc-info-item">
                <span class="sbc-label">📚 課程</span>
                <span class="sbc-value">{{ item.session.courseTitle }}</span>
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">🎤 講師</span>
                <span class="sbc-value">{{ item.session.lecturerTitle }} {{ item.session.lecturerName }}</span>
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">🕐 時間</span>
                <span class="sbc-value">{{ formatBookingTime(item.session) }}</span>
              </div>
              <div class="sbc-info-item" v-if="item.session.durationMinutes">
                <span class="sbc-label">⏱ 時長</span>
                <span class="sbc-value">{{ item.session.durationMinutes }} 分鐘</span>
              </div>
            </div>

            <!-- 預習內容（若有） -->
            <div
              v-if="item.session.prep.scriptures.length || item.session.prep.readingNotes || item.session.prep.materials"
              class="sbc-prep mt-3"
            >
              <div class="sbc-prep-title">📖 預習內容</div>
              <div v-if="item.session.prep.scriptures.length" class="sbc-prep-row">
                <strong>📜 預習經文：</strong>
                <span v-for="(s, i) in item.session.prep.scriptures" :key="i" class="scripture-chip">{{ s }}</span>
              </div>
              <div v-if="item.session.prep.readingNotes" class="sbc-prep-row">
                <strong>📝 準備說明：</strong>{{ item.session.prep.readingNotes }}
              </div>
              <div v-if="item.session.prep.materials" class="sbc-prep-row">
                <strong>📎 補充材料：</strong>{{ item.session.prep.materials }}
              </div>
            </div>
          </div>

          <div v-if="studentUpcomingSessions.length === 0" class="empty-booking-hint">
            目前沒有即將到來的預約 🎉
          </div>
        </div>
      </div>

      <!-- 歷史紀錄 -->
      <div class="booking-section mt-5">
        <h4 class="booking-section-title">📁 歷史預約紀錄</h4>
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
                  {{ item.attendee.attendanceStatus === 'attended' ? '✅ 已出席'
                    : item.attendee.attendanceStatus === 'absent' ? '❌ 缺席'
                    : '📩 已邀請' }}
                </span>
              </div>
              <button
                v-if="item.session.status === 'completed' && !item.attendee.studentFeedback"
                class="btn btn-sm btn-outline"
                @click="emit('open-feedback', item)"
                :id="`btn-feedback-${item.session.id}`"
              >✍️ 填寫心得</button>
              <button
                v-else-if="item.session.status === 'completed' && item.attendee.studentFeedback"
                class="btn btn-sm btn-ghost"
                @click="emit('open-feedback', item)"
              >📝 查看/修改心得</button>
            </div>

            <div class="sbc-info mt-2">
              <div class="sbc-info-item">
                <span class="sbc-label">📚 課程</span>
                <span class="sbc-value">{{ item.session.courseTitle }}</span>
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">🎤 講師</span>
                <span class="sbc-value">{{ item.session.lecturerTitle }} {{ item.session.lecturerName }}</span>
              </div>
              <div class="sbc-info-item">
                <span class="sbc-label">🕐 時間</span>
                <span class="sbc-value">{{ formatBookingTime(item.session) }}</span>
              </div>
            </div>

            <!-- 教師回饋（若有） -->
            <div v-if="item.attendee.teacherFeedback" class="sbc-teacher-feedback mt-2">
              <strong>💬 教師回饋：</strong>{{ item.attendee.teacherFeedback }}
            </div>

            <!-- 我的心得 -->
            <div v-if="item.attendee.studentFeedback" class="sbc-my-feedback mt-2">
              <strong>✍️ 我的心得：</strong>{{ item.attendee.studentFeedback }}
            </div>
          </div>

          <div v-if="studentPastSessions.length === 0" class="empty-booking-hint">
            還沒有歷史預約紀錄
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
  const map: Record<string, string> = {
    pending: '⏳ 待確認',
    confirmed: '📅 已確認',
    completed: '✅ 已完成',
    cancelled: '❌ 已取消'
  }
  return map[status] || status
}

function formatBookingTime(session: { proposedAt: string; confirmedAt?: string; status: string }): string {
  const dt = session.confirmedAt || session.proposedAt
  if (!dt) return '—'
  const d = new Date(dt)
  const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
  const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  const isPending = !session.confirmedAt && session.status === 'pending'
  return `${dateStr} ${timeStr}${isPending ? '（提議）' : ''}`
}
</script>
